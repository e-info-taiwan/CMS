import { GoogleGenAI } from '@google/genai'
import { RawDraftContentState, RawDraftContentBlock } from 'draft-js'
import type { KeystoneContext } from '@keystone-6/core/types'
import { GraphQLError } from 'graphql'
import envVar from '../environment-variables'
import { tagEmbeddingService } from './tag-embedding'

const ALLOWED_ROLES = ['admin', 'moderator', 'editor', 'contributor'] as const

export type SuggestPostTagsResult = {
  candidates: PostTagCandidate[]
  geminiSuggestions: string[]
  possibleTypos: { original: string; suggested: string }[]
  targetCount: number
  currentTagCount: number
}

const POST_TAG_TARGET_COUNT = 8
const POST_TAG_EXISTING_CANDIDATE_MAX = 6
const POST_TAG_NEW_CANDIDATE_MAX = 3

export type PostTagCandidate = {
  key: string
  suggestedName: string
  kind: 'featured-existing' | 'existing' | 'new'
  existingTag?: { id: string; name: string; isFeatured: boolean }
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

  return unique.slice(0, 12)
}

type GeminiTagAndTypoResponse = {
  tags: string[]
  possibleTypos: { original: string; suggested: string }[]
}

type GeminiCandidateSelection = {
  existingTagIds: string[]
  newTags: string[]
}

type ExistingTagOption = {
  id: number
  name: string
  isFeatured: boolean
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

async function callGeminiForTagSuggestions(
  plainText: string
): Promise<GeminiTagAndTypoResponse> {
  if (!envVar.ai.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY_NOT_CONFIGURED')
  }

  const ai = new GoogleGenAI({})
  const prompt = `你是關心環境與公共議題的媒體編輯助理。請閱讀以下文章（已轉成純文字、段落以空行分隔），完成兩件事：
1) 從文章歸納 8 到 12 個簡短中文「標籤」名詞或短語（每個標籤不超過 20 字，不要編號、不要說明）。
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

function parseGeminiCandidateSelection(text: string): GeminiCandidateSelection {
  const trimmed = text.trim()
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  const jsonSource = fenceMatch ? fenceMatch[1].trim() : trimmed

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonSource)
  } catch {
    throw new Error('GEMINI_CANDIDATE_JSON_PARSE_ERROR')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('GEMINI_CANDIDATE_JSON_NOT_OBJECT')
  }

  const payload = parsed as { existingTagIds?: unknown; newTags?: unknown }
  const existingTagIds = Array.isArray(payload.existingTagIds)
    ? payload.existingTagIds.map((id) => String(id).trim()).filter(Boolean)
    : []
  const newTags = parseTagJsonArray(JSON.stringify(payload.newTags ?? []))

  return {
    existingTagIds: [...new Set(existingTagIds)].slice(
      0,
      POST_TAG_EXISTING_CANDIDATE_MAX
    ),
    newTags: newTags.slice(0, POST_TAG_NEW_CANDIDATE_MAX),
  }
}

async function callGeminiForCandidateSelection({
  articleText,
  articleConcepts,
  existingTagPool,
}: {
  articleText: string
  articleConcepts: string[]
  existingTagPool: ExistingTagOption[]
}): Promise<GeminiCandidateSelection> {
  if (!envVar.ai.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY_NOT_CONFIGURED')
  }

  const ai = new GoogleGenAI({})
  const existingTagsContext = existingTagPool.length
    ? existingTagPool
        .map(
          (tag) =>
            `- id: ${tag.id}; 名稱: ${tag.name}; 首頁顯示: ${
              tag.isFeatured ? '是' : '否'
            }`
        )
        .join('\n')
    : '（沒有可用的既有標籤）'
  const prompt = `你是關心環境與公共議題的媒體編輯助理。以下是文章內容、主題概念，以及由向量檢索召回的既有標籤。

文章內容：
${articleText.slice(0, 12000)}

主題概念：${articleConcepts.join('、')}

既有標籤候選池：
${existingTagsContext}

請產生「這一次」可讓編輯勾選的標籤候選。既有標籤優先：只有確實符合文章主題時，從候選池選 5 到 6 個 existingTagIds；首頁顯示標籤只有在同樣相關時優先，不可牽強配對。再提出 2 到 3 個確實是新概念、且不與選定既有標籤同義或重複的 newTags。若相關既有標籤不足，寧可少選，絕對不要選不相關的標籤；新標籤最多 3 個。

請只輸出 JSON，且 existingTagIds 必須完全使用上方列出的 id：
{
  "existingTagIds": ["123", "456"],
  "newTags": ["新標籤一", "新標籤二"]
}`
  const result = await ai.models.generateContent({
    model: envVar.ai.gemini.model,
    contents: prompt,
  })
  const text = result.text?.trim()
  if (!text) throw new Error('SERVER_ERROR')
  return parseGeminiCandidateSelection(text)
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

async function buildExistingTagPool(
  context: KeystoneContext,
  concepts: string[],
  currentTagIds: Set<number>
): Promise<ExistingTagOption[]> {
  const pool = new Map<number, ExistingTagOption>()
  const add = (tag: ExistingTagOption) => {
    if (!currentTagIds.has(tag.id)) pool.set(tag.id, tag)
  }

  // Include featured tags as candidates, but let the second Gemini pass decide
  // whether they are actually relevant instead of forcing a homepage tag.
  const featuredTags = await context.prisma.Tag.findMany({
    where: { isFeatured: true },
    select: { id: true, name: true, isFeatured: true },
    orderBy: { name: 'asc' },
  })
  featuredTags.forEach((tag: ExistingTagOption) => add(tag))

  try {
    for (const concept of concepts) {
      const exact = await context.prisma.Tag.findUnique({
        where: { name: concept },
        select: { id: true, name: true, isFeatured: true },
      })
      if (exact) add(exact)

      const embedding = await tagEmbeddingService.generateVertexEmbedding(
        concept
      )
      const similar = await tagEmbeddingService.findSimilarTags({
        prisma: context.prisma,
        embedding,
      })
      similar.forEach((tag) =>
        add({ id: tag.id, name: tag.name, isFeatured: tag.isFeatured })
      )
    }
  } catch (err) {
    console.error('[ai-post-tags-suggestion] embedding retrieval failed', err)
    throw new GraphQLError(
      '無法比對既有標籤向量，請確認 Vertex AI 標籤嵌入設定是否正確。',
      { extensions: { code: 'EMBEDDING_ERROR' } }
    )
  }

  return [...pool.values()].slice(0, 60)
}

function toExistingCandidate(tag: ExistingTagOption): PostTagCandidate {
  return {
    key: `existing-${tag.id}`,
    suggestedName: tag.name,
    kind: tag.isFeatured ? 'featured-existing' : 'existing',
    existingTag: {
      id: String(tag.id),
      name: tag.name,
      isFeatured: tag.isFeatured,
    },
  }
}

/**
 * 讀取文章 draft 內容、呼叫 Gemini 建議標籤並比對既有標籤；不建立或連結任何標籤。
 */
export async function suggestAndApplyPostTags(
  context: KeystoneContext,
  postIdInput: string | number
): Promise<SuggestPostTagsResult> {
  if (!envVar.featureToggle.postVector || !envVar.featureToggle.tagVector) {
    throw new GraphQLError('AI 標籤建議功能目前已停用', {
      extensions: { code: 'FEATURE_DISABLED' },
    })
  }

  const postId = Number(postIdInput)
  if (!Number.isFinite(postId)) {
    throw new GraphQLError('文章 id 無效', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }

  await assertUserCanSuggestTagsForPost(context, postId)

  const post = await context.prisma.Post.findUnique({
    where: { id: postId },
    select: { content: true, tags: { select: { id: true } } },
  })

  const plain = extractDraftToPlainParagraphs(
    post?.content as RawDraftContentState | string | null | undefined
  )
  if (!plain) {
    throw new GraphQLError('文章內文為空，無法建議標籤', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }

  const currentTagIds = new Set(
    (post?.tags ?? []).map((tag: { id: number }) => tag.id)
  )
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

  let selection: GeminiCandidateSelection
  let existingTagPool: ExistingTagOption[]
  try {
    existingTagPool = await buildExistingTagPool(
      context,
      geminiSuggestions,
      currentTagIds
    )
    selection = await callGeminiForCandidateSelection({
      articleText: plain,
      articleConcepts: geminiSuggestions,
      existingTagPool,
    })
  } catch (error) {
    console.error('[ai-post-tags-suggestion] candidate selection error', error)
    if (error instanceof GraphQLError) throw error
    if (
      error instanceof Error &&
      (error.message === 'GEMINI_CANDIDATE_JSON_PARSE_ERROR' ||
        error.message === 'GEMINI_CANDIDATE_JSON_NOT_OBJECT')
    ) {
      throw new GraphQLError('AI 回傳的候選標籤格式異常，請再試一次', {
        extensions: { code: 'GEMINI_PARSE_ERROR' },
      })
    }
    throw new GraphQLError('AI 服務暫時無法使用，請稍後再試', {
      extensions: { code: 'AI_ERROR' },
    })
  }

  const tagsById = new Map(existingTagPool.map((tag) => [String(tag.id), tag]))
  const candidates: PostTagCandidate[] = []
  const usedCandidateKeys = new Set<string>()
  for (const id of selection.existingTagIds) {
    const tag = tagsById.get(id)
    if (!tag || usedCandidateKeys.has(`existing-${tag.id}`)) continue
    candidates.push(toExistingCandidate(tag))
    usedCandidateKeys.add(`existing-${tag.id}`)
  }

  for (const name of selection.newTags) {
    if (
      candidates.filter((tag) => tag.kind === 'new').length >=
      POST_TAG_NEW_CANDIDATE_MAX
    )
      break
    const existing = await context.prisma.Tag.findUnique({
      where: { name },
      select: { id: true, name: true, isFeatured: true },
    })
    if (existing && !currentTagIds.has(existing.id)) {
      const candidate = toExistingCandidate(existing)
      if (
        !usedCandidateKeys.has(candidate.key) &&
        candidates.filter((tag) => tag.kind !== 'new').length <
          POST_TAG_EXISTING_CANDIDATE_MAX
      ) {
        candidates.push(candidate)
        usedCandidateKeys.add(candidate.key)
      }
      continue
    }
    const key = `new-${name.toLowerCase()}`
    if (!existing && !usedCandidateKeys.has(key)) {
      candidates.push({ key, suggestedName: name, kind: 'new' })
      usedCandidateKeys.add(key)
    }
  }

  if (candidates.length === 0) {
    return {
      candidates: [],
      geminiSuggestions,
      possibleTypos,
      targetCount: POST_TAG_TARGET_COUNT,
      currentTagCount: currentTagIds.size,
    }
  }

  return {
    candidates,
    geminiSuggestions,
    possibleTypos,
    targetCount: POST_TAG_TARGET_COUNT,
    currentTagCount: currentTagIds.size,
  }
}

export async function applyPostTagCandidates(
  context: KeystoneContext,
  postIdInput: string | number,
  selections: unknown
): Promise<{ tags: { id: string; name: string }[] }> {
  const postId = Number(postIdInput)
  if (!Number.isFinite(postId) || !Array.isArray(selections)) {
    throw new GraphQLError('套用的標籤資料無效', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }
  await assertUserCanSuggestTagsForPost(context, postId)

  const tags: { id: string; name: string }[] = []
  const seenIds = new Set<string>()
  for (const selection of selections) {
    if (!selection || typeof selection !== 'object') continue
    const item = selection as { existingTagId?: unknown; name?: unknown }
    let tag: { id: string; name: string } | null = null
    const existingId = Number(item.existingTagId)
    if (Number.isFinite(existingId)) {
      const existing = await context.prisma.Tag.findUnique({
        where: { id: existingId },
        select: { id: true, name: true },
      })
      if (existing) tag = { id: String(existing.id), name: existing.name }
    } else {
      const name = String(item.name ?? '').trim()
      if (!name) continue
      const existing = await context.prisma.Tag.findUnique({ where: { name } })
      const created =
        existing ?? (await context.db.Tag.createOne({ data: { name } }))
      tag = { id: String(created.id), name: String(created.name ?? name) }
    }
    if (tag && !seenIds.has(tag.id)) {
      seenIds.add(tag.id)
      tags.push(tag)
    }
  }
  if (tags.length === 0) {
    throw new GraphQLError('請至少選擇一個標籤', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }
  await context.prisma.Post.update({
    where: { id: postId },
    data: { tags: { connect: tags.map((tag) => ({ id: Number(tag.id) })) } },
  })
  return { tags }
}
