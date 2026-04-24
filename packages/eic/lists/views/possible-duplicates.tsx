import React from 'react'
import { FieldProps } from '@keystone-6/core/types'
import { FieldContainer, FieldLabel } from '@keystone-ui/fields'
import { useQuery, gql } from '@apollo/client'

const SIMILAR_PHOTOS_QUERY = gql`
  query GetSimilarPhotos($id: ID!) {
    similarPhotos(id: $id) {
      id
      name
      resized {
        w480
      }
    }
  }
`

// The value will be an array of objects like: [{ id: '123', url: 'https://...' }]
export function Field({ value }: FieldProps<any>) {
  const isCreate =
    typeof window !== 'undefined' &&
    window.location.pathname.endsWith('/create')
  const itemId =
    typeof window !== 'undefined'
      ? window.location.pathname.split('/').pop()
      : null

  const { data, loading } = useQuery(SIMILAR_PHOTOS_QUERY, {
    variables: { id: itemId },
    skip: isCreate || !itemId,
  })

  const pHashDuplicates = value && Array.isArray(value) ? value : []
  const vectorSimilar = data?.similarPhotos || []

  if (pHashDuplicates.length === 0 && vectorSimilar.length === 0 && !loading) {
    return null
  }

  // Deduplicate: if a vector similar photo is already in pHash, hide it from vector view
  const pHashIds = new Set(pHashDuplicates.map((d: any) => d.id.toString()))
  const filteredVector = vectorSimilar.filter(
    (v: any) => !pHashIds.has(v.id.toString())
  )

  return (
    <FieldContainer
      style={{
        backgroundColor: '#f8f9fa',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {pHashDuplicates.length > 0 && (
        <div
          style={{
            backgroundColor: '#fff3cd',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #ffe69c',
          }}
        >
          <FieldLabel style={{ color: '#856404', fontWeight: 'bold' }}>
            完全相同的圖片 (pHash)
          </FieldLabel>
          <div
            style={{
              color: '#856404',
              fontSize: '13px',
              margin: '4px 0 12px 0',
            }}
          >
            這些圖片的像素特徵極為相近，很可能是重複上傳。
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {pHashDuplicates.map((dup: any) => (
              <a
                key={dup.id}
                href={`/photos/${dup.id}`}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <div
                  style={{
                    border: '2px solid #dc3545',
                    borderRadius: '4px',
                    padding: '4px',
                    background: 'white',
                  }}
                >
                  <img
                    src={dup.url}
                    alt={`Photo ${dup.id}`}
                    style={{
                      width: '120px',
                      height: '120px',
                      objectFit: 'cover',
                    }}
                  />
                  <div
                    style={{
                      fontSize: '12px',
                      textAlign: 'center',
                      marginTop: '4px',
                      color: '#dc3545',
                      fontWeight: 'bold',
                    }}
                  >
                    高度重複 ID: {dup.id}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '12px' }}>AI 語意分析尋找相似圖片中...</div>
      ) : (
        filteredVector.length > 0 && (
          <div
            style={{
              backgroundColor: '#e2e3e5',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #d6d8db',
            }}
          >
            <FieldLabel style={{ color: '#383d41', fontWeight: 'bold' }}>
              場景或語意相似的圖片 (AI Vector)
            </FieldLabel>
            <div
              style={{
                color: '#383d41',
                fontSize: '13px',
                margin: '4px 0 12px 0',
              }}
            >
              這些圖片在場景、構圖或語意上高度相關，可能是連拍或過往的相似素材。
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {filteredVector.map((dup: any) => (
                <a
                  key={dup.id}
                  href={`/photos/${dup.id}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'none', maxWidth: '130px' }}
                >
                  <div
                    style={{
                      border: '1px solid #adb5bd',
                      borderRadius: '4px',
                      padding: '4px',
                      background: 'white',
                    }}
                  >
                    <img
                      src={dup?.resized?.w480 || ''}
                      alt={`Photo ${dup.id}`}
                      style={{
                        width: '120px',
                        height: '120px',
                        objectFit: 'cover',
                      }}
                    />
                    <div
                      style={{
                        fontSize: '12px',
                        textAlign: 'center',
                        marginTop: '4px',
                        color: '#495057',
                      }}
                    >
                      情境相似 ID: {dup.id}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )
      )}
    </FieldContainer>
  )
}
