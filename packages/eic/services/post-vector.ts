import { createHash } from 'crypto'
import type { KeystoneContext } from '@keystone-6/core/types'
import envVar from '../environment-variables'
import { tagEmbeddingService, toVectorLiteral } from './tag-embedding'

const POST_VECTOR_KIND_DOCUMENT = 'document'
const SOURCE_TEXT_MAX_LENGTH = 8000
const SOURCE_PREVIEW_MAX_LENGTH = 500

type NamedRelation = {
  name?: string | null
}

type PostVectorSourcePost = {
  id: number
  title?: string | null
  subtitle?: string | null
  briefApiData?: unknown
  contentApiData?: unknown
  contentPreview?: string | null
  section?: NamedRelation | null
  categories?: NamedRelation[]
  tags?: NamedRelation[]
}

type ExistingPostVectorRow = {
  sourceHash: string | null
}

export type RefreshPostDocumentVectorResult = {
  postId: number
  status: 'disabled' | 'not_found' | 'empty' | 'skipped' | 'updated'
}

const normalizeText = (value: unknown) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const truncateText = (value: string, length: number) =>
  value.length > length ? value.slice(0, length) : value

const extractContentStrings = (value: unknown, output: string[]) => {
  if (Array.isArray(value)) {
    for (const item of value) {
      extractContentStrings(item, output)
    }
    return
  }

  if (!value || typeof value !== 'object') {
    return
  }

  const content = (value as { content?: unknown }).content
  if (!Array.isArray(content)) {
    return
  }

  for (const item of content) {
    if (typeof item === 'string') {
      output.push(item)
    } else {
      extractContentStrings(item, output)
    }
  }
}

export const extractApiDataPlainText = (apiData: unknown) => {
  const texts: string[] = []
  extractContentStrings(apiData, texts)
  return normalizeText(texts.join(' '))
}

const relationNamesText = (label: string, items?: NamedRelation[]) => {
  const names = (items ?? [])
    .map((item) => normalizeText(item.name))
    .filter(Boolean)

  return names.length > 0 ? `${label}: ${names.join(', ')}` : ''
}

const createSourceHash = ({
  kind,
  model,
  dimension,
  text,
}: {
  kind: string
  model: string
  dimension: number
  text: string
}) =>
  createHash('sha256')
    .update([kind, model, String(dimension), text].join('\n'))
    .digest('hex')

export async function buildPostDocumentVectorSource(
  context: KeystoneContext,
  postId: number
) {
  const post = (await context.prisma.Post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      subtitle: true,
      briefApiData: true,
      contentApiData: true,
      contentPreview: true,
      section: { select: { name: true } },
      categories: { select: { name: true } },
      tags: { select: { name: true } },
    },
  })) as PostVectorSourcePost | null

  if (!post) {
    return null
  }

  const contentText =
    extractApiDataPlainText(post.contentApiData) ||
    normalizeText(post.contentPreview)

  const fullText = [
    normalizeText(post.title),
    normalizeText(post.subtitle),
    extractApiDataPlainText(post.briefApiData),
    contentText,
    post.section?.name ? `Section: ${normalizeText(post.section.name)}` : '',
    relationNamesText('Categories', post.categories),
    relationNamesText('Tags', post.tags),
  ]
    .filter(Boolean)
    .join('\n\n')

  const text = truncateText(fullText, SOURCE_TEXT_MAX_LENGTH)
  const model = envVar.tagEmbedding.vertex.model
  const dimension = envVar.tagEmbedding.vertex.outputDimensionality

  return {
    kind: POST_VECTOR_KIND_DOCUMENT,
    model,
    dimension,
    text,
    sourceHash: createSourceHash({
      kind: POST_VECTOR_KIND_DOCUMENT,
      model,
      dimension,
      text,
    }),
    sourcePreview: truncateText(text, SOURCE_PREVIEW_MAX_LENGTH),
  }
}

export async function refreshPostDocumentVector(
  context: KeystoneContext,
  postId: number
): Promise<RefreshPostDocumentVectorResult> {
  if (!envVar.featureToggle.postVector) {
    return { postId, status: 'disabled' }
  }

  const source = await buildPostDocumentVectorSource(context, postId)
  if (!source) {
    return { postId, status: 'not_found' }
  }

  if (!source.text) {
    await context.prisma.$executeRawUnsafe(
      'DELETE FROM "PostVector" WHERE "post" = $1 AND "kind" = $2',
      postId,
      source.kind
    )
    return { postId, status: 'empty' }
  }

  const rows = (await context.prisma.$queryRawUnsafe(
    `SELECT "sourceHash"
     FROM "PostVector"
     WHERE "post" = $1
       AND "kind" = $2
       AND "model" = $3
     LIMIT 1`,
    postId,
    source.kind,
    source.model
  )) as ExistingPostVectorRow[]

  if (rows[0]?.sourceHash === source.sourceHash) {
    return { postId, status: 'skipped' }
  }

  const embedding = await tagEmbeddingService.generateVertexEmbedding(
    source.text
  )

  await context.prisma.$executeRawUnsafe(
    `INSERT INTO "PostVector"
       ("post", "kind", "model", "dimension", "sourceHash", "sourcePreview",
        "embedding", "embeddingGeneratedAt", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, CAST($7 AS vector), NOW(), NOW(), NOW())
     ON CONFLICT ("post", "kind", "model")
     DO UPDATE SET
       "dimension" = EXCLUDED."dimension",
       "sourceHash" = EXCLUDED."sourceHash",
       "sourcePreview" = EXCLUDED."sourcePreview",
       "embedding" = EXCLUDED."embedding",
       "embeddingGeneratedAt" = NOW(),
       "updatedAt" = NOW()`,
    postId,
    source.kind,
    source.model,
    source.dimension,
    source.sourceHash,
    source.sourcePreview,
    toVectorLiteral(embedding)
  )

  return { postId, status: 'updated' }
}
