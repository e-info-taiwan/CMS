import React, { useCallback, useState } from 'react'
import { FieldContainer, FieldLabel } from '@keystone-ui/fields'
import { Button } from '@keystone-ui/button'
import {
  gql,
  useApolloClient,
  useMutation,
  useQuery,
} from '@keystone-6/core/admin-ui/apollo'
import { useToasts } from '@keystone-ui/toast'
import { normalizePhotoImageLabelSuggestions } from '../../services/photo-image-label-suggestions'

const IMAGE_LABEL_QUERY = gql`
  query GetPhotoImageLabelSuggestions($id: ID!) {
    photo(where: { id: $id }) {
      id
      imageLabelSuggestions
      imageLabelStatus
      imageLabelFailReason
      imageLabelUpdatedAt
      tags {
        id
        name
      }
    }
  }
`

const PHOTO_TAG_SUGGESTION_QUERY = gql`
  query SuggestPhotoTagsFromImageLabels($photoId: ID!) {
    suggestPhotoTagsFromImageLabels(photoId: $photoId)
  }
`

const APPLY_PHOTO_TAGS_MUTATION = gql`
  mutation ApplyPhotoImageLabelTags($photoId: ID!) {
    applyPhotoImageLabelTags(photoId: $photoId)
  }
`

const NOTICE_STYLE = {
  fontSize: '14px',
  fontWeight: 600,
  marginTop: '4px',
}

const percent = (score: number) => `${Math.round(score * 100)}%`

type Tag = {
  id: string
  name: string
}

type PhotoTagCandidate = {
  sourceTag: string
  sourceLabel: string
  translatedName: string
  score: number
  matchedTag: (Tag & { distance?: number; similarity?: number }) | null
  matchType: 'exact' | 'embedding' | 'none'
}

type PhotoTagSuggestionPayload = {
  candidates?: PhotoTagCandidate[]
  matchedTags?: Tag[]
  appliedTags?: Tag[]
  skippedExistingTags?: Tag[]
}

const formatTags = (tags: Tag[] | undefined) =>
  tags && tags.length > 0 ? tags.map((tag) => tag.name).join('、') : ''

const renderMatchType = (candidate: PhotoTagCandidate) => {
  if (candidate.matchType === 'exact') {
    return '名稱相同'
  }
  if (candidate.matchType === 'embedding') {
    const similarity = candidate.matchedTag?.similarity
    return typeof similarity === 'number'
      ? `語意相近 ${Math.round(similarity * 100)}%`
      : '語意相近'
  }
  return '未匹配'
}

export function Field() {
  const client = useApolloClient()
  const toasts = useToasts()
  const [suggestionPayload, setSuggestionPayload] =
    useState<PhotoTagSuggestionPayload | null>(null)

  const isCreate =
    typeof window !== 'undefined' &&
    window.location.pathname.endsWith('/create')
  const itemId =
    typeof window !== 'undefined'
      ? window.location.pathname.split('/').pop()
      : null

  const { data, loading, error, refetch } = useQuery(IMAGE_LABEL_QUERY, {
    variables: { id: itemId },
    skip: isCreate || !itemId,
  })
  const [applyPhotoTags, { loading: applying }] = useMutation(
    APPLY_PHOTO_TAGS_MUTATION
  )
  const [previewing, setPreviewing] = useState(false)

  const preview = useCallback(async () => {
    if (!itemId) return
    setPreviewing(true)
    try {
      const { data: result } = await client.query({
        query: PHOTO_TAG_SUGGESTION_QUERY,
        variables: { photoId: itemId },
        fetchPolicy: 'network-only',
      })
      setSuggestionPayload(
        result?.suggestPhotoTagsFromImageLabels as PhotoTagSuggestionPayload
      )
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: string }).message)
          : '請稍後再試'
      toasts.addToast({
        title: '比對圖片標籤失敗',
        message: msg,
        tone: 'negative',
      })
    } finally {
      setPreviewing(false)
    }
  }, [client, itemId, toasts])

  const apply = useCallback(async () => {
    if (!itemId) return
    try {
      const { data: result } = await applyPhotoTags({
        variables: { photoId: itemId },
      })
      const payload = result?.applyPhotoImageLabelTags as
        | PhotoTagSuggestionPayload
        | undefined
      setSuggestionPayload(payload ?? null)
      await refetch()
      try {
        client.cache.evict({
          id: client.cache.identify({ __typename: 'Photo', id: itemId }),
          fieldName: 'tags',
        })
        client.cache.gc()
      } catch (cacheError) {
        console.warn('[photo-image-label-suggestions] cache evict', cacheError)
      }
      const appliedNames = formatTags(payload?.appliedTags)
      const skippedNames = formatTags(payload?.skippedExistingTags)
      toasts.addToast({
        title: appliedNames ? '已套用圖片標籤' : '沒有新的圖片標籤可套用',
        message:
          appliedNames ||
          (skippedNames ? `已存在：${skippedNames}` : '沒有匹配的既有標籤'),
        tone: appliedNames ? 'positive' : 'help',
      })
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: string }).message)
          : '請稍後再試'
      toasts.addToast({
        title: '套用圖片標籤失敗',
        message: msg,
        tone: 'negative',
      })
    }
  }, [applyPhotoTags, client, itemId, refetch, toasts])

  if (isCreate) {
    return null
  }

  const photo = data?.photo
  const suggestions = normalizePhotoImageLabelSuggestions(
    photo?.imageLabelSuggestions
  )
  const status = photo?.imageLabelStatus || ''
  const failReason = photo?.imageLabelFailReason || ''
  const currentTags = (photo?.tags ?? []) as Tag[]
  const updatedAt = photo?.imageLabelUpdatedAt
    ? new Date(photo.imageLabelUpdatedAt).toLocaleString('zh-TW')
    : ''

  if (error) {
    return (
      <FieldContainer>
        <FieldLabel>圖片建議標籤</FieldLabel>
        <div style={{ color: '#dc2626', ...NOTICE_STYLE }}>
          圖片標籤查詢失敗: {error.message}
        </div>
      </FieldContainer>
    )
  }

  if (loading) {
    return (
      <FieldContainer>
        <FieldLabel>圖片建議標籤</FieldLabel>
        <div style={NOTICE_STYLE}>圖片標籤讀取中...</div>
      </FieldContainer>
    )
  }

  if (status === 'failed') {
    return (
      <FieldContainer>
        <FieldLabel>圖片建議標籤</FieldLabel>
        <div style={{ color: '#dc2626', ...NOTICE_STYLE }}>
          圖片標籤產生失敗{failReason ? `: ${failReason}` : ''}
        </div>
      </FieldContainer>
    )
  }

  if (suggestions.length === 0) {
    return (
      <FieldContainer>
        <FieldLabel>圖片建議標籤</FieldLabel>
        <div style={{ color: '#6b7280', ...NOTICE_STYLE }}>
          {status ? '沒有可套用的圖片建議標籤。' : '尚未產生圖片建議標籤。'}
        </div>
      </FieldContainer>
    )
  }

  return (
    <FieldContainer>
      <FieldLabel>圖片建議標籤</FieldLabel>
      {currentTags.length > 0 && (
        <div
          style={{ color: '#374151', fontSize: '13px', marginBottom: '8px' }}
        >
          已連結標籤：{formatTags(currentTags)}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {suggestions.map((suggestion) => (
          <span
            key={suggestion.tag}
            title={`${suggestion.source || 'unknown'} score ${
              suggestion.score
            }`}
            style={{
              border: '1px solid #93c5fd',
              borderRadius: '4px',
              background: '#eff6ff',
              color: '#1d4ed8',
              padding: '4px 8px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {suggestion.label} ({percent(suggestion.score)})
          </span>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '12px',
        }}
      >
        <Button
          size="small"
          onClick={preview}
          isDisabled={previewing || applying}
        >
          {previewing ? '比對中…' : '比對既有 Tags'}
        </Button>
        <Button
          size="small"
          tone="active"
          onClick={apply}
          isDisabled={previewing || applying}
        >
          {applying ? '套用中…' : '套用匹配 Tags'}
        </Button>
      </div>
      {suggestionPayload?.candidates &&
        suggestionPayload.candidates.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div
              style={{
                color: '#374151',
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '6px',
              }}
            >
              Tag 比對結果
            </div>
            <div style={{ display: 'grid', gap: '6px' }}>
              {suggestionPayload.candidates.map((candidate) => (
                <div
                  key={`${candidate.sourceTag}:${candidate.translatedName}`}
                  style={{
                    borderLeft: `3px solid ${
                      candidate.matchedTag ? '#16a34a' : '#d1d5db'
                    }`,
                    color: '#374151',
                    fontSize: '13px',
                    paddingLeft: '8px',
                  }}
                >
                  {candidate.sourceLabel} → {candidate.translatedName}
                  {candidate.matchedTag
                    ? ` → ${candidate.matchedTag.name}（${renderMatchType(
                        candidate
                      )}）`
                    : ' → 無既有 Tag'}
                </div>
              ))}
            </div>
          </div>
        )}
      {updatedAt && (
        <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px' }}>
          更新時間：{updatedAt}
        </div>
      )}
    </FieldContainer>
  )
}
