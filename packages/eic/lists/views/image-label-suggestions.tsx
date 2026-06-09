import React from 'react'
import { FieldContainer, FieldLabel } from '@keystone-ui/fields'
import { useQuery, gql } from '@apollo/client'
import { normalizePhotoImageLabelSuggestions } from '../../services/photo-image-label-suggestions'

const IMAGE_LABEL_QUERY = gql`
  query GetPhotoImageLabelSuggestions($id: ID!) {
    photo(where: { id: $id }) {
      id
      imageLabelSuggestions
      imageLabelStatus
      imageLabelFailReason
      imageLabelUpdatedAt
    }
  }
`

const NOTICE_STYLE = {
  fontSize: '14px',
  fontWeight: 600,
  marginTop: '4px',
}

const percent = (score: number) => `${Math.round(score * 100)}%`

export function Field() {
  const isCreate =
    typeof window !== 'undefined' &&
    window.location.pathname.endsWith('/create')
  const itemId =
    typeof window !== 'undefined'
      ? window.location.pathname.split('/').pop()
      : null

  const { data, loading, error } = useQuery(IMAGE_LABEL_QUERY, {
    variables: { id: itemId },
    skip: isCreate || !itemId,
  })

  if (isCreate) {
    return null
  }

  const photo = data?.photo
  const suggestions = normalizePhotoImageLabelSuggestions(
    photo?.imageLabelSuggestions
  )
  const status = photo?.imageLabelStatus || ''
  const failReason = photo?.imageLabelFailReason || ''
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
      {updatedAt && (
        <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px' }}>
          更新時間：{updatedAt}
        </div>
      )}
    </FieldContainer>
  )
}
