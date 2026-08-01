export type PhotoImageLabelSuggestion = {
  tag: string
  label: string
  score: number
  topicality?: number
  source?: string
}

const DEFAULT_LIMIT = 10

const PERSON_LABELS = new Set([
  'person',
  'people',
  'human',
  'man',
  'woman',
  'boy',
  'girl',
  'child',
  'children',
  'infant',
  'face',
  'human face',
  'portrait',
])

const normalizeTag = (value: unknown) =>
  typeof value === 'string'
    ? value.trim().toLowerCase().replace(/\s+/g, ' ')
    : ''

const normalizeLabel = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

/**
 * Google Vision may use several labels for people.  Keep the CMS-facing tag
 * consistent so all of them can match the existing 「人物」 Tag.
 */
export const isPersonImageLabel = (...values: unknown[]) =>
  values.some((value) => PERSON_LABELS.has(normalizeTag(value)))

export const normalizePhotoImageLabelSuggestions = (
  rawSuggestions: unknown,
  limit = DEFAULT_LIMIT
): PhotoImageLabelSuggestion[] => {
  if (!Array.isArray(rawSuggestions)) {
    return []
  }

  const byTag = new Map<string, PhotoImageLabelSuggestion>()
  for (const item of rawSuggestions) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const raw = item as Record<string, unknown>
    const tag = normalizeTag(raw.tag)
    const score = Number(raw.score)
    if (!tag || !Number.isFinite(score)) {
      continue
    }

    const label = normalizeLabel(raw.label, tag)
    const isPerson = isPersonImageLabel(tag, label)
    const suggestion: PhotoImageLabelSuggestion = {
      tag: isPerson ? 'person' : tag,
      label: isPerson ? '人物' : label,
      score,
    }
    const topicality = Number(raw.topicality)
    if (Number.isFinite(topicality)) {
      suggestion.topicality = topicality
    }
    if (typeof raw.source === 'string' && raw.source.trim()) {
      suggestion.source = raw.source.trim()
    }

    const existing = byTag.get(suggestion.tag)
    if (!existing || suggestion.score > existing.score) {
      byTag.set(suggestion.tag, suggestion)
    }
  }

  return Array.from(byTag.values())
    .sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag))
    .slice(0, limit > 0 ? limit : DEFAULT_LIMIT)
}
