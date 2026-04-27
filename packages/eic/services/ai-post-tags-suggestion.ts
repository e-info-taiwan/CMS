import { GoogleGenAI } from '@google/genai'
import { RawDraftContentState, RawDraftContentBlock } from 'draft-js'
import type { KeystoneContext } from '@keystone-6/core/types'
import { GraphQLError } from 'graphql'
import envVar from '../environment-variables'
import { tagEmbeddingService } from './tag-embedding'

const ALLOWED_ROLES = ['admin', 'moderator', 'editor', 'contributor'] as const

export type SuggestPostTagsResult = {
  tags: { id: string; name: string }[]
  geminiSuggestions: string[]
  possibleTypos: { original: string; suggested: string }[]
}

export function extractDraftToPlainParagraphs(
  content: RawDraftContentState | string | null | undefined
): string {
  if (!content) return ''
  if (typeof content === 'string') return content.trim()

  if (
    typeof content === 'object' &&
    content !== null &&
    'blocks' in content &&
    Array.isArray((content as RawDraftContentState).blocks)
  ) {
    const blocks = (content as RawDraftContentState).blocks
    return blocks
      .map((block: RawDraftContentBlock) => (block.text || '').trim())
      .filter(Boolean)
      .join('\n\n')
      .trim()
  }

  try {
    return JSON.stringify(content)
  } catch {
    return ''
  }
}

function parseTagJsonArray(text: string): string[] {
  const trimmed = text.trim()
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  const jsonSource = fenceMatch ? fenceMatch[1].trim() : trimmed

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonSource)
  } catch {
    throw new Error('GEMINI_TAG_JSON_PARSE_ERROR')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('GEMINI_TAG_JSON_NOT_ARRAY')
  }

  const names = parsed
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean)

  const unique: string[] = []
  const seen = new Set<string>()
  for (const n of names) {
    const key = n.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(n)
  }

  return unique.slice(0, 5)
}

type GeminiTagAndTypoResponse = {
  tags: string[]
  possibleTypos: { original: string; suggested: string }[]
}

function parseGeminiTagAndTypoJson(text: string): GeminiTagAndTypoResponse {
  const trimmed = text.trim()
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  const jsonSource = fenceMatch ? fenceMatch[1].trim() : trimmed

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonSource)
  } catch {
    throw new Error('GEMINI_TAG_TYPO_JSON_PARSE_ERROR')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('GEMINI_TAG_TYPO_JSON_NOT_OBJECT')
  }

  const payload = parsed as {
    tags?: unknown
    possibleTypos?: unknown
  }

  const tags = parseTagJsonArray(JSON.stringify(payload.tags ?? []))
  if (tags.length === 0) {
    throw new Error('GEMINI_TAG_COUNT_ZERO')
  }

  const rawTypos = Array.isArray(payload.possibleTypos)
    ? payload.possibleTypos
    : []
  const typoCandidates = rawTypos
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const original = String(
        (item as { original?: unknown }).original ?? ''
      ).trim()
      const suggested = String(
        (item as { suggested?: unknown }).suggested ?? ''
      ).trim()
      if (!original || !suggested || original === suggested) return null
      return { original, suggested }
    })
    .filter((x): x is { original: string; suggested: string } => Boolean(x))

  const uniqueTypos: { original: string; suggested: string }[] = []
  const seenTypo = new Set<string>()
  for (const typo of typoCandidates) {
    const key = `${typo.original}__${typo.suggested}`.toLowerCase()
    if (seenTypo.has(key)) continue
    seenTypo.add(key)
    uniqueTypos.push(typo)
  }

  return {
    tags,
    possibleTypos: uniqueTypos.slice(0, 20),
  }
}

function formatTypoCandidatesForStorage(
  possibleTypos: { original: string; suggested: string }[]
): string {
  if (possibleTypos.length === 0) {
    return ''
  }
  return possibleTypos
    .map((item, idx) => `${idx + 1}. ${item.original} -> ${item.suggested}`)
    .join('\n')
}

async function callGeminiForTagSuggestions(
  plainText: string
): Promise<GeminiTagAndTypoResponse> {
  if (!envVar.ai.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY_NOT_CONFIGURED')
  }

  const ai = new GoogleGenAI({})
  const prompt = `你是關心環境與公共議題的媒體編輯助理。請閱讀以下文章（已轉成純文字、段落以空行分隔），完成兩件事：
1) 從文章歸納 3 到 5 個簡短中文「標籤」名詞或短語（每個標籤不超過 20 字，不要編號、不要說明）。
2) 盡可能找出文內「可能的錯字」或明顯不自然用詞，列出原文與建議改寫（如果沒有就回傳空陣列）。

請只輸出一個 JSON 物件，格式如下（不要輸出任何額外文字）：
{
  "tags": ["再生能源", "政策"],
  "possibleTypos": [
    { "original": "錯字原文", "suggested": "建議寫法" }
  ]
}

文章：
${plainText}`

  const result = await ai.models.generateContent({
    model: envVar.ai.gemini.model,
    contents: prompt,
  })

  const text = result.text?.trim()
  if (!text) {
    throw new Error('SERVER_ERROR')
  }

  return parseGeminiTagAndTypoJson(text)
}

async function assertUserCanSuggestTagsForPost(
  context: KeystoneContext,
  postId: number
): Promise<void> {
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

  const post = await context.prisma.Post.findUnique({
    where: { id: postId },
    select: { id: true, createdById: true },
  })

  if (!post) {
    throw new GraphQLError('找不到文章', { extensions: { code: 'NOT_FOUND' } })
  }

  if (role === 'admin' || role === 'moderator' || role === 'editor') {
    return
  }

  if (role === 'contributor') {
    const uid = Number(session.itemId)
    if (!Number.isFinite(uid) || Number(post.createdById) !== uid) {
      throw new GraphQLError('沒有權限編輯此文章', {
        extensions: { code: 'FORBIDDEN' },
      })
    }
  }
}

async function resolveOrCreateTag(
  context: KeystoneContext,
  suggestedName: string
): Promise<{ id: string; name: string }> {
  const name = suggestedName.trim()
  if (!name) {
    throw new Error('EMPTY_TAG_NAME')
  }

  const existingByName = await context.prisma.Tag.findUnique({
    where: { name },
  })
  if (existingByName) {
    return { id: String(existingByName.id), name: existingByName.name }
  }

  try {
    const embedding = await tagEmbeddingService.generateVertexEmbedding(name)
    const similar = await tagEmbeddingService.findSimilarTags({
      prisma: context.prisma,
      embedding,
    })
    const best = similar[0]
    if (
      best &&
      best.distance <= envVar.tagEmbedding.similarityCheck.distanceThreshold
    ) {
      return { id: String(best.id), name: best.name }
    }
  } catch (err) {
    console.error(
      '[ai-post-tags-suggestion] embedding / similarity failed',
      err
    )
    throw new GraphQLError(
      '無法比對既有標籤向量，請確認 Vertex AI 標籤嵌入設定是否正確。',
      { extensions: { code: 'EMBEDDING_ERROR' } }
    )
  }

  const created = await context.db.Tag.createOne({
    data: {
      name,
      checkSimilarity: false,
    },
  })

  return { id: String(created.id), name: String(created.name ?? name) }
}

/**
 * 讀取文章 draft 內容、呼叫 Gemini 建議標籤、依向量比對或新建標籤，並 connect 到文章。
 */
export async function suggestAndApplyPostTags(
  context: KeystoneContext,
  postIdInput: string | number
): Promise<SuggestPostTagsResult> {
  const postId = Number(postIdInput)
  if (!Number.isFinite(postId)) {
    throw new GraphQLError('文章 id 無效', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }

  await assertUserCanSuggestTagsForPost(context, postId)

  const post = await context.prisma.Post.findUnique({
    where: { id: postId },
    select: { content: true },
  })

  const plain = extractDraftToPlainParagraphs(
    post?.content as RawDraftContentState | string | null | undefined
  )
  if (!plain) {
    throw new GraphQLError('文章內文為空，無法建議標籤', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }

  let geminiSuggestions: string[]
  let possibleTypos: { original: string; suggested: string }[]
  try {
    const aiResult = await callGeminiForTagSuggestions(plain)
    geminiSuggestions = aiResult.tags
    possibleTypos = aiResult.possibleTypos
  } catch (error) {
    console.error('[ai-post-tags-suggestion] Gemini error', error)
    if (error instanceof GraphQLError) {
      throw error
    }
    if (error instanceof Error) {
      switch (error.message) {
        case 'GEMINI_API_KEY_NOT_CONFIGURED':
          throw new GraphQLError('AI 服務未設定 API 金鑰', {
            extensions: { code: 'CONFIG_ERROR' },
          })
        case 'GEMINI_TAG_JSON_PARSE_ERROR':
        case 'GEMINI_TAG_JSON_NOT_ARRAY':
        case 'GEMINI_TAG_TYPO_JSON_PARSE_ERROR':
        case 'GEMINI_TAG_TYPO_JSON_NOT_OBJECT':
        case 'GEMINI_TAG_COUNT_ZERO':
          throw new GraphQLError('AI 回傳的標籤格式異常，請再試一次', {
            extensions: { code: 'GEMINI_PARSE_ERROR' },
          })
        default:
          throw new GraphQLError('AI 服務暫時無法使用，請稍後再試', {
            extensions: { code: 'AI_ERROR' },
          })
      }
    }
    throw new GraphQLError('AI 服務暫時無法使用，請稍後再試', {
      extensions: { code: 'AI_ERROR' },
    })
  }

  const resolved: { id: string; name: string }[] = []
  const seenIds = new Set<string>()

  for (const label of geminiSuggestions) {
    const tag = await resolveOrCreateTag(context, label)
    if (seenIds.has(tag.id)) continue
    seenIds.add(tag.id)
    resolved.push(tag)
  }

  if (resolved.length === 0) {
    throw new GraphQLError('未能產生任何標籤', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }

  await context.prisma.Post.update({
    where: { id: postId },
    data: {
      aiPossibleTypos: formatTypoCandidatesForStorage(possibleTypos),
      tags: {
        connect: resolved.map((t) => ({ id: Number(t.id) })),
      },
    },
  })

  return { tags: resolved, geminiSuggestions, possibleTypos }
}
