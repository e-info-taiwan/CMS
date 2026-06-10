import { GoogleGenAI } from '@google/genai'
import type { KeystoneContext } from '@keystone-6/core/types'
import { GraphQLError } from 'graphql'
import envVar from '../environment-variables'
import { normalizePhotoImageLabelSuggestions } from './photo-image-label-suggestions'
import { tagEmbeddingService } from './tag-embedding'

const ALLOWED_ROLES = ['admin', 'moderator', 'editor'] as const

type ExistingTag = {
  id: number | string
  name: string
}

type MatchedPhotoTag = {
  id: string
  name: string
  distance?: number
  similarity?: number
}

type PhotoTagCandidate = {
  sourceTag: string
  sourceLabel: string
  translatedName: string
  score: number
  matchedTag: MatchedPhotoTag | null
  matchType: 'exact' | 'embedding' | 'none'
}

type PhotoTagSuggestionResult = {
  candidates: PhotoTagCandidate[]
  matchedTags: MatchedPhotoTag[]
  currentTags: { id: string; name: string }[]
}

type ApplyPhotoTagSuggestionResult = PhotoTagSuggestionResult & {
  appliedTags: { id: string; name: string }[]
  skippedExistingTags: { id: string; name: string }[]
}

type PhotoLabelTranslation = {
  label: string
  translatedName: string
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const parsePhotoId = (photoIdInput: string | number) => {
  const photoId = Number(photoIdInput)
  if (!Number.isFinite(photoId)) {
    throw new GraphQLError('圖片 id 無效', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }
  return photoId
}

async function assertUserCanManagePhotoTags(context: KeystoneContext) {
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

function parseGeminiJson(text: string): unknown {
  const trimmed = text.trim()
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  const jsonSource = fenceMatch ? fenceMatch[1].trim() : trimmed

  try {
    return JSON.parse(jsonSource)
  } catch {
    throw new Error('GEMINI_PHOTO_LABEL_TRANSLATION_JSON_PARSE_ERROR')
  }
}

function parsePhotoLabelTranslations(text: string): PhotoLabelTranslation[] {
  const parsed = parseGeminiJson(text)
  const translations =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as { translations?: unknown }).translations
      : parsed

  if (!Array.isArray(translations)) {
    throw new Error('GEMINI_PHOTO_LABEL_TRANSLATION_JSON_NOT_ARRAY')
  }

  const result: PhotoLabelTranslation[] = []
  const seen = new Set<string>()
  for (const item of translations) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const raw = item as Record<string, unknown>
    const label = isNonEmptyString(raw.label) ? raw.label.trim() : ''
    const translatedName = isNonEmptyString(raw.translatedName)
      ? raw.translatedName.trim()
      : ''
    if (!label || !translatedName) {
      continue
    }

    const key = label.toLowerCase()
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    result.push({ label, translatedName })
  }

  return result
}

async function translateLabelsToChinese(labels: string[]) {
  if (labels.length === 0) {
    return new Map<string, string>()
  }

  if (!envVar.ai.gemini.apiKey) {
    throw new GraphQLError('AI 服務未設定 API 金鑰', {
      extensions: { code: 'CONFIG_ERROR' },
    })
  }

  const ai = new GoogleGenAI({})
  const prompt = `請把以下 Google Vision 圖片標籤翻譯成台灣常用繁體中文標籤名稱。

規則：
- 每個 translatedName 用簡短名詞或名詞片語。
- 不要解釋，不要新增輸入之外的 label。
- 動植物名稱若可判斷，使用台灣常見中文名稱。
- 只輸出 JSON，格式如下：
{
  "translations": [
    { "label": "Owl", "translatedName": "貓頭鷹" }
  ]
}

labels:
${JSON.stringify(labels)}`

  const response = await ai.models.generateContent({
    model: envVar.ai.gemini.model,
    contents: prompt,
  })

  const text = response.text?.trim()
  if (!text) {
    throw new Error('GEMINI_PHOTO_LABEL_TRANSLATION_EMPTY_RESPONSE')
  }

  const translations = parsePhotoLabelTranslations(text)
  return new Map(
    translations.map((translation) => [
      translation.label.toLowerCase(),
      translation.translatedName,
    ])
  )
}

const toPublicTag = (tag: ExistingTag): { id: string; name: string } => ({
  id: String(tag.id),
  name: String(tag.name),
})

async function findMatchingTag(
  context: KeystoneContext,
  translatedName: string
): Promise<{ tag: MatchedPhotoTag; matchType: 'exact' | 'embedding' } | null> {
  const exact = await context.prisma.Tag.findUnique({
    where: { name: translatedName },
  })
  if (exact) {
    return {
      tag: toPublicTag(exact),
      matchType: 'exact',
    }
  }

  if (!envVar.featureToggle.tagVector) {
    return null
  }

  const embedding = await tagEmbeddingService.generateVertexEmbedding(
    translatedName
  )
  if (!Array.isArray(embedding)) {
    return null
  }

  const similar = await tagEmbeddingService.findSimilarTags({
    prisma: context.prisma,
    embedding,
  })
  const best = similar?.[0]
  if (
    !best ||
    best.distance > envVar.tagEmbedding.similarityCheck.distanceThreshold
  ) {
    return null
  }

  return {
    tag: {
      id: String(best.id),
      name: best.name,
      distance: best.distance,
      similarity: best.similarity,
    },
    matchType: 'embedding',
  }
}

export async function suggestPhotoTagsFromImageLabels(
  context: KeystoneContext,
  photoIdInput: string | number
): Promise<PhotoTagSuggestionResult> {
  await assertUserCanManagePhotoTags(context)

  const photoId = parsePhotoId(photoIdInput)
  const photo = await context.prisma.Photo.findUnique({
    where: { id: photoId },
    select: {
      id: true,
      imageLabelSuggestions: true,
      tags: { select: { id: true, name: true } },
    },
  })

  if (!photo) {
    throw new GraphQLError('找不到圖片', { extensions: { code: 'NOT_FOUND' } })
  }

  const suggestions = normalizePhotoImageLabelSuggestions(
    photo.imageLabelSuggestions
  )
  const currentTags = (photo.tags ?? []).map(toPublicTag)
  if (suggestions.length === 0) {
    return { candidates: [], matchedTags: [], currentTags }
  }

  const translations = await translateLabelsToChinese(
    suggestions.map((suggestion) => suggestion.label)
  )
  const candidates: PhotoTagCandidate[] = []
  const matchedTags: MatchedPhotoTag[] = []
  const seenMatchedIds = new Set<string>()

  for (const suggestion of suggestions) {
    const translatedName =
      translations.get(suggestion.label.toLowerCase()) || suggestion.label
    const match = await findMatchingTag(context, translatedName)
    const matchedTag = match?.tag ?? null
    if (matchedTag && !seenMatchedIds.has(matchedTag.id)) {
      seenMatchedIds.add(matchedTag.id)
      matchedTags.push(matchedTag)
    }

    candidates.push({
      sourceTag: suggestion.tag,
      sourceLabel: suggestion.label,
      translatedName,
      score: suggestion.score,
      matchedTag,
      matchType: match?.matchType ?? 'none',
    })
  }

  return {
    candidates,
    matchedTags,
    currentTags,
  }
}

export async function applyPhotoImageLabelTags(
  context: KeystoneContext,
  photoIdInput: string | number
): Promise<ApplyPhotoTagSuggestionResult> {
  const suggestionResult = await suggestPhotoTagsFromImageLabels(
    context,
    photoIdInput
  )
  const photoId = parsePhotoId(photoIdInput)
  const currentTagIds = new Set(
    suggestionResult.currentTags.map((tag) => tag.id)
  )
  const matchedById = new Map<string, { id: string; name: string }>()
  for (const candidate of suggestionResult.candidates) {
    if (!candidate.matchedTag) {
      continue
    }
    matchedById.set(candidate.matchedTag.id, {
      id: candidate.matchedTag.id,
      name: candidate.matchedTag.name,
    })
  }

  const skippedExistingTags = Array.from(matchedById.values()).filter((tag) =>
    currentTagIds.has(tag.id)
  )
  const appliedTags = Array.from(matchedById.values()).filter(
    (tag) => !currentTagIds.has(tag.id)
  )

  if (appliedTags.length > 0) {
    await context.prisma.Photo.update({
      where: { id: photoId },
      data: {
        tags: {
          connect: appliedTags.map((tag) => ({ id: Number(tag.id) })),
        },
      },
      select: {
        tags: { select: { id: true, name: true } },
      },
    })
  }

  return {
    ...suggestionResult,
    appliedTags,
    skippedExistingTags,
  }
}
