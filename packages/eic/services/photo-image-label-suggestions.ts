export type PhotoImageLabelSuggestion = {
  tag: string
  label: string
  score: number
  topicality?: number
  source?: string
}

const DEFAULT_LIMIT = 10

const normalizeTag = (value: unknown) =>
  typeof value === 'string'
    ? value.trim().toLowerCase().replace(/\s+/g, ' ')
    : ''

const normalizeLabel = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

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

    const suggestion: PhotoImageLabelSuggestion = {
      tag,
      label: normalizeLabel(raw.label, tag),
      score,
    }
    const topicality = Number(raw.topicality)
    if (Number.isFinite(topicality)) {
      suggestion.topicality = topicality
    }
    if (typeof raw.source === 'string' && raw.source.trim()) {
      suggestion.source = raw.source.trim()
    }

    const existing = byTag.get(tag)
    if (!existing || suggestion.score > existing.score) {
      byTag.set(tag, suggestion)
    }
  }

  return Array.from(byTag.values())
    .sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag))
    .slice(0, limit > 0 ? limit : DEFAULT_LIMIT)
}
