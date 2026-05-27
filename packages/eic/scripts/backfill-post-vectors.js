/* eslint-env node */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createHash } = require('crypto')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { GoogleGenAI } = require('@google/genai')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client')

const KIND = 'document'
const SOURCE_TEXT_MAX_LENGTH = 8000
const SOURCE_PREVIEW_MAX_LENGTH = 500
const BATCH_SIZE = Number(process.env.POST_VECTOR_BACKFILL_BATCH_SIZE || 100)
const EMBEDDING_MODEL =
  process.env.TAG_VERTEX_EMBEDDING_MODEL || 'gemini-embedding-001'
const EMBEDDING_DIMENSION = Number(
  process.env.TAG_VERTEX_EMBEDDING_DIMENSION || 1536
)
const PROJECT =
  process.env.TAG_VERTEX_PROJECT || process.env.GOOGLE_CLOUD_PROJECT
const LOCATION =
  process.env.TAG_VERTEX_LOCATION ||
  process.env.GOOGLE_CLOUD_LOCATION ||
  'us-central1'
const DRY_RUN = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')

/**
 * @typedef {{name?: string | null}} NamedRelation
 * @typedef {{
 *   id: number,
 *   title?: string | null,
 *   subtitle?: string | null,
 *   briefApiData?: unknown,
 *   contentApiData?: unknown,
 *   contentPreview?: string | null,
 *   section?: NamedRelation | null,
 *   categories?: NamedRelation[],
 *   tags?: NamedRelation[],
 * }} PostRow
 * @typedef {{text: string, sourceHash: string, sourcePreview: string}} PostVectorSource
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * @param {string} value
 * @param {number} length
 * @returns {string}
 */
const truncateText = (value, length) =>
  value.length > length ? value.slice(0, length) : value

/**
 * @param {unknown} value
 * @param {string[]} output
 * @returns {void}
 */
const extractContentStrings = (value, output) => {
  if (Array.isArray(value)) {
    for (const item of value) {
      extractContentStrings(item, output)
    }
    return
  }

  if (!value || typeof value !== 'object') {
    return
  }

  const content = /** @type {{content?: unknown}} */ (value).content
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

/**
 * @param {unknown} apiData
 * @returns {string}
 */
const extractApiDataPlainText = (apiData) => {
  /** @type {string[]} */
  const texts = []
  extractContentStrings(apiData, texts)
  return normalizeText(texts.join(' '))
}

/**
 * @param {string} label
 * @param {NamedRelation[] | null | undefined} items
 * @returns {string}
 */
const relationNamesText = (label, items) => {
  const names = (items || [])
    .map((item) => normalizeText(item.name))
    .filter(Boolean)

  return names.length > 0 ? `${label}: ${names.join(', ')}` : ''
}

/**
 * @param {string} text
 * @returns {string}
 */
const createSourceHash = (text) =>
  createHash('sha256')
    .update(
      [KIND, EMBEDDING_MODEL, String(EMBEDDING_DIMENSION), text].join('\n')
    )
    .digest('hex')

/**
 * @param {number[]} values
 * @returns {string}
 */
const toVectorLiteral = (values) => `[${values.join(',')}]`

function createGenAI() {
  if (!PROJECT) {
    throw new Error('TAG_VERTEX_PROJECT or GOOGLE_CLOUD_PROJECT is required')
  }
  if (!LOCATION) {
    throw new Error('TAG_VERTEX_LOCATION or GOOGLE_CLOUD_LOCATION is required')
  }

  return new GoogleGenAI({
    vertexai: true,
    project: PROJECT,
    location: LOCATION,
    apiVersion: 'v1',
  })
}

/**
 * @param {import('@google/genai').GoogleGenAI} ai
 * @param {string} term
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(ai, term) {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [term],
    config: {
      taskType: 'SEMANTIC_SIMILARITY',
      outputDimensionality: EMBEDDING_DIMENSION,
      autoTruncate: true,
    },
  })
  const embedding = response.embeddings?.[0]?.values
  if (
    !Array.isArray(embedding) ||
    embedding.length !== EMBEDDING_DIMENSION ||
    !embedding.every(
      (item) => typeof item === 'number' && Number.isFinite(item)
    )
  ) {
    throw new Error('Invalid Vertex embedding response')
  }
  return embedding
}

/**
 * @param {PostRow} post
 * @returns {PostVectorSource}
 */
function buildSource(post) {
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
  return {
    text,
    sourceHash: createSourceHash(text),
    sourcePreview: truncateText(text, SOURCE_PREVIEW_MAX_LENGTH),
  }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {number} cursor
 * @returns {Promise<PostRow[]>}
 */
async function fetchPosts(prisma, cursor) {
  return /** @type {Promise<PostRow[]>} */ (
    prisma.post.findMany({
      where: { id: { gt: cursor } },
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
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
    })
  )
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {number} postId
 * @returns {Promise<string | null>}
 */
async function getExistingSourceHash(prisma, postId) {
  const rows = /** @type {Array<{sourceHash?: string | null}>} */ (
    await prisma.$queryRawUnsafe(
      `SELECT "sourceHash"
       FROM "PostVector"
       WHERE "post" = $1
         AND "kind" = $2
         AND "model" = $3
       LIMIT 1`,
      postId,
      KIND,
      EMBEDDING_MODEL
    )
  )

  return rows[0]?.sourceHash || null
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {number} postId
 * @returns {Promise<void>}
 */
async function deletePostVector(prisma, postId) {
  await prisma.$executeRawUnsafe(
    'DELETE FROM "PostVector" WHERE "post" = $1 AND "kind" = $2',
    postId,
    KIND
  )
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {number} postId
 * @param {PostVectorSource} source
 * @param {number[]} embedding
 * @returns {Promise<void>}
 */
async function upsertPostVector(prisma, postId, source, embedding) {
  await prisma.$executeRawUnsafe(
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
    KIND,
    EMBEDDING_MODEL,
    EMBEDDING_DIMENSION,
    source.sourceHash,
    source.sourcePreview,
    toVectorLiteral(embedding)
  )
}

async function main() {
  const prisma = new PrismaClient()
  const ai = createGenAI()
  let cursor = 0
  let scanned = 0
  let updated = 0
  let skipped = 0
  let emptied = 0
  let failed = 0
  let hasMore = true

  try {
    while (hasMore) {
      const posts = await fetchPosts(prisma, cursor)
      if (posts.length === 0) {
        hasMore = false
        break
      }

      for (const post of posts) {
        cursor = post.id
        scanned += 1

        try {
          const source = buildSource(post)
          if (!source.text) {
            if (!DRY_RUN) {
              await deletePostVector(prisma, post.id)
            }
            emptied += 1
            continue
          }

          const existingSourceHash = await getExistingSourceHash(
            prisma,
            post.id
          )
          if (!FORCE && existingSourceHash === source.sourceHash) {
            skipped += 1
            continue
          }

          if (!DRY_RUN) {
            const embedding = await generateEmbedding(ai, source.text)
            await upsertPostVector(prisma, post.id, source, embedding)
          }
          updated += 1

          if (updated % 50 === 0) {
            console.log(
              `[post-vector-backfill] progress scanned=${scanned} updated=${updated} skipped=${skipped} emptied=${emptied} failed=${failed}`
            )
          }
        } catch (error) {
          failed += 1
          console.error(`[post-vector-backfill] failed id=${post.id}`, error)
        }
      }
    }
  } finally {
    await prisma.$disconnect()
  }

  console.log(
    `[post-vector-backfill] scanned=${scanned} ${
      DRY_RUN ? 'wouldUpdate' : 'updated'
    }=${updated} skipped=${skipped} emptied=${emptied} failed=${failed} model=${EMBEDDING_MODEL} dimension=${EMBEDDING_DIMENSION}`
  )
}

main().catch((error) => {
  console.error('[post-vector-backfill] failed:', error)
  process.exit(1)
})
