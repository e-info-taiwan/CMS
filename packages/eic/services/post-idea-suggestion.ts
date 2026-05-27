import { GoogleGenAI } from '@google/genai'
import type { KeystoneContext } from '@keystone-6/core/types'
import { GraphQLError } from 'graphql'
import envVar from '../environment-variables'
import { tagEmbeddingService, toVectorLiteral } from './tag-embedding'

const ALLOWED_ROLES = ['admin', 'moderator', 'editor', 'contributor'] as const
const POST_VECTOR_KIND_DOCUMENT = 'document'

type PostIdeaStructuredData = {
  normalizedTitle: string
  summary: string
  keywords: string[]
  entities: string[]
  locations: string[]
  timeScope: string
  sectionHints: string[]
  tagHints: string[]
}

type PostVectorCandidateRow = {
  postId: number
  sourcePreview: string | null
  distance: unknown
}

type PostResult = {
  id: number
  title: string
  subtitle: string | null
  state: string | null
  publishTime: Date
  contentPreview: string | null
  section: { name: string } | null
  categories: { name: string }[]
  tags: { name: string }[]
}

const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''

const normalizeStringArray = (value: unknown, limit: number) => {
  if (!Array.isArray(value)) {
    return []
  }

  const seen = new Set<string>()
  const result: string[] = []
  for (const item of value) {
    const text = normalizeText(item)
    if (!text) {
      continue
    }
    const key = text.toLowerCase()
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    result.push(text)
    if (result.length >= limit) {
      break
    }
  }
  return result
}

const extractJsonObjectSource = (text: string) => {
  const trimmed = text.trim()
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  if (fenceMatch) {
    return fenceMatch[1].trim()
  }

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1)
  }

  return trimmed
}

const parseStructuredIdea = (text: string): PostIdeaStructuredData => {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonObjectSource(text))
  } catch {
    throw new Error('POST_IDEA_JSON_PARSE_ERROR')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('POST_IDEA_JSON_NOT_OBJECT')
  }

  const payload = parsed as Record<string, unknown>
  const normalizedTitle = normalizeText(payload.normalizedTitle)
  const summary = normalizeText(payload.summary)

  if (!normalizedTitle && !summary) {
    throw new Error('POST_IDEA_JSON_EMPTY')
  }

  return {
    normalizedTitle,
    summary,
    keywords: normalizeStringArray(payload.keywords, 10),
    entities: normalizeStringArray(payload.entities, 10),
    locations: normalizeStringArray(payload.locations, 10),
    timeScope: normalizeText(payload.timeScope),
    sectionHints: normalizeStringArray(payload.sectionHints, 5),
    tagHints: normalizeStringArray(payload.tagHints, 10),
  }
}

const assertUserCanSuggestPostIdea = (context: KeystoneContext) => {
  const session = context.session as
    | { data?: { role?: string }; itemId?: string | number }
    | undefined

  if (!session?.data) {
    throw new GraphQLError('需要登入', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }

  const role = session.data.role
  if (
    !role ||
    !ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])
  ) {
    throw new GraphQLError('沒有權限', { extensions: { code: 'FORBIDDEN' } })
  }
}

async function callGeminiForStructuredIdea(
  input: string
): Promise<PostIdeaStructuredData> {
  if (!envVar.ai.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY_NOT_CONFIGURED')
  }

  const ai = new GoogleGenAI({})
  const prompt = `你是環境與公共議題媒體的資深編輯。請將使用者正在發想的報題提案整理成可搜尋既有文章資料庫的 JSON。

請只輸出 JSON 物件，不要 Markdown，不要額外說明。格式如下：
{
  "normalizedTitle": "用一句完整中文標題整理報題方向",
  "summary": "用 1 到 3 句整理核心議題、衝突、可能角度",
  "keywords": ["最多 10 個關鍵詞"],
  "entities": ["人物、機關、組織、公司"],
  "locations": ["地點"],
  "timeScope": "近期、歷史脈絡、長期追蹤，或空字串",
  "sectionHints": ["可能適用的頻道或主題分類"],
  "tagHints": ["可能適用的標籤"]
}

使用者輸入：
${input}`

  const result = await ai.models.generateContent({
    model: envVar.ai.gemini.model,
    contents: prompt,
  })

  const text = result.text?.trim()
  if (!text) {
    throw new Error('POST_IDEA_LLM_EMPTY_RESPONSE')
  }

  return parseStructuredIdea(text)
}

const buildIdeaQueryText = (
  originalInput: string,
  structured: PostIdeaStructuredData
) =>
  [
    `原始輸入：${originalInput}`,
    `整理後標題：${structured.normalizedTitle}`,
    `摘要：${structured.summary}`,
    `關鍵詞：${structured.keywords.join('、')}`,
    `實體：${structured.entities.join('、')}`,
    `地點：${structured.locations.join('、')}`,
    `時間範圍：${structured.timeScope}`,
    `分類提示：${structured.sectionHints.join('、')}`,
    `標籤提示：${structured.tagHints.join('、')}`,
  ]
    .filter((line) => !line.endsWith('：'))
    .join('\n')

const toFiniteDistance = (value: unknown) => {
  const distance = Number(value)
  return Number.isFinite(distance) ? distance : null
}

async function findPostVectorCandidates({
  context,
  embedding,
}: {
  context: KeystoneContext
  embedding: number[]
}) {
  const config = envVar.postIdeaSuggestion
  const rows = (await context.prisma.$queryRawUnsafe(
    `SELECT pv."post" AS "postId",
            pv."sourcePreview",
            pv."embedding" <=> CAST($1 AS vector) AS distance
     FROM "PostVector" pv
     WHERE pv."kind" = $2
       AND pv."model" = $3
       AND pv."embedding" IS NOT NULL
       AND (pv."embedding" <=> CAST($1 AS vector)) <= $4
     ORDER BY pv."embedding" <=> CAST($1 AS vector) ASC
     LIMIT $5`,
    toVectorLiteral(embedding),
    POST_VECTOR_KIND_DOCUMENT,
    envVar.tagEmbedding.vertex.model,
    config.maxDistance,
    config.candidateLimit
  )) as PostVectorCandidateRow[]

  return rows
    .map((row) => {
      const postId = Number(row.postId)
      const distance = toFiniteDistance(row.distance)
      if (!Number.isFinite(postId) || distance === null) {
        return null
      }
      return {
        postId,
        sourcePreview: row.sourcePreview ?? '',
        distance,
      }
    })
    .filter(
      (
        row
      ): row is { postId: number; sourcePreview: string; distance: number } =>
        Boolean(row)
    )
}

const includesTerm = (text: string, term: string) =>
  Boolean(term) && text.toLowerCase().includes(term.toLowerCase())

const scorePost = ({
  post,
  sourcePreview,
  distance,
  structured,
}: {
  post: PostResult
  sourcePreview: string
  distance: number
  structured: PostIdeaStructuredData
}) => {
  const relationText = [
    post.section?.name ?? '',
    ...post.categories.map((item) => item.name),
    ...post.tags.map((item) => item.name),
  ].join(' ')
  const searchableText = [
    post.title,
    post.subtitle ?? '',
    post.contentPreview ?? '',
    sourcePreview,
    relationText,
  ].join(' ')

  const keywordTerms = [
    ...structured.keywords,
    ...structured.entities,
    ...structured.locations,
  ]
  const matchedKeywords = keywordTerms.filter((term) =>
    includesTerm(searchableText, term)
  )
  const matchedHints = [
    ...structured.sectionHints,
    ...structured.tagHints,
  ].filter((term) => includesTerm(relationText, term))

  const similarity = Math.max(0, Math.min(1, 1 - distance))
  const keywordScore =
    keywordTerms.length > 0 ? matchedKeywords.length / keywordTerms.length : 0
  const hintTerms = [...structured.sectionHints, ...structured.tagHints]
  const hintScore =
    hintTerms.length > 0 ? matchedHints.length / hintTerms.length : 0
  const shouldBoostRecent = /近期|最近|最新|今年|本週|本月|今日|昨天/.test(
    structured.timeScope
  )
  const ageDays =
    (Date.now() - post.publishTime.getTime()) / (1000 * 60 * 60 * 24)
  const recencyScore = shouldBoostRecent
    ? ageDays <= 90
      ? 1
      : ageDays <= 365
      ? 0.5
      : 0
    : 0
  const score =
    similarity * 0.74 +
    keywordScore * 0.14 +
    hintScore * 0.08 +
    recencyScore * 0.04

  return {
    post,
    sourcePreview,
    distance,
    similarity,
    score,
    matchedKeywords,
    matchedHints,
  }
}

export async function suggestPostIdea(context: KeystoneContext, input: string) {
  assertUserCanSuggestPostIdea(context)

  if (!envVar.featureToggle.postVector) {
    throw new GraphQLError('報題建議功能目前已停用', {
      extensions: { code: 'FEATURE_DISABLED' },
    })
  }

  const originalInput = normalizeText(input)
  if (originalInput.length < 4) {
    throw new GraphQLError('請輸入較完整的報題發想', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }

  let structured: PostIdeaStructuredData
  try {
    structured = await callGeminiForStructuredIdea(originalInput)
  } catch (error) {
    console.error('[post-idea-suggestion] Gemini error', error)
    if (error instanceof Error) {
      if (error.message === 'GEMINI_API_KEY_NOT_CONFIGURED') {
        throw new GraphQLError('AI 服務未設定 API 金鑰', {
          extensions: { code: 'CONFIG_ERROR' },
        })
      }
      if (error.message.startsWith('POST_IDEA_JSON_')) {
        throw new GraphQLError('AI 回傳的報題結構格式異常，請再試一次', {
          extensions: { code: 'GEMINI_PARSE_ERROR' },
        })
      }
    }
    throw new GraphQLError('AI 服務暫時無法使用，請稍後再試', {
      extensions: { code: 'AI_ERROR' },
    })
  }

  const queryText = buildIdeaQueryText(originalInput, structured)
  let candidates: Awaited<ReturnType<typeof findPostVectorCandidates>>
  try {
    const embedding = await tagEmbeddingService.generateVertexEmbedding(
      queryText
    )
    candidates = await findPostVectorCandidates({ context, embedding })
  } catch (error) {
    console.error('[post-idea-suggestion] vector search error', error)
    throw new GraphQLError('無法查詢文章向量，請稍後再試', {
      extensions: { code: 'VECTOR_SEARCH_ERROR' },
    })
  }

  if (candidates.length === 0) {
    return {
      structured,
      queryText,
      results: [],
    }
  }

  const posts = (await context.prisma.Post.findMany({
    where: { id: { in: candidates.map((candidate) => candidate.postId) } },
    select: {
      id: true,
      title: true,
      subtitle: true,
      state: true,
      publishTime: true,
      contentPreview: true,
      section: { select: { name: true } },
      categories: { select: { name: true } },
      tags: { select: { name: true } },
    },
  })) as PostResult[]

  const postsById = new Map(posts.map((post) => [Number(post.id), post]))
  const results = candidates
    .map((candidate) => {
      const post = postsById.get(candidate.postId)
      if (!post) {
        return null
      }
      return scorePost({
        post,
        sourcePreview: candidate.sourcePreview,
        distance: candidate.distance,
        structured,
      })
    })
    .filter((result): result is NonNullable<typeof result> => Boolean(result))
    .sort((a, b) => b.score - a.score || a.distance - b.distance)
    .slice(0, envVar.postIdeaSuggestion.resultLimit)
    .map((result) => ({
      post: {
        id: String(result.post.id),
        title: result.post.title,
        subtitle: result.post.subtitle,
        state: result.post.state,
        publishTime: result.post.publishTime.toISOString(),
        contentPreview: result.post.contentPreview,
        section: result.post.section,
        categories: result.post.categories,
        tags: result.post.tags,
      },
      sourcePreview: result.sourcePreview,
      distance: result.distance,
      similarity: result.similarity,
      score: result.score,
      matchedKeywords: result.matchedKeywords,
      matchedHints: result.matchedHints,
    }))

  return {
    structured,
    queryText,
    results,
  }
}
