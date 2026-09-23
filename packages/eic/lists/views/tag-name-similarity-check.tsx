import React, { useCallback, useState } from 'react'
import { Button } from '@keystone-ui/button'
import { FieldContainer } from '@keystone-ui/fields'
import { gql, useApolloClient } from '@keystone-6/core/admin-ui/apollo'
import type { FieldProps } from '@keystone-6/core/types'
import {
  CardValue,
  Cell,
  controller,
  Field as TextField,
} from '@keystone-6/core/fields/types/text/views'

export { CardValue, Cell, controller }

const CHECK_TAG_NAME_SIMILARITY = gql`
  query CheckTagNameSimilarity($name: String!) {
    checkTagNameSimilarity(name: $name)
  }
`

type Result = {
  enabled?: boolean
  distanceThreshold?: number
  similarTags?: {
    id: string
    name: string
    brief?: string | null
    distance: number
    similarity: number
  }[]
}

export function Field(props: FieldProps<typeof controller>) {
  const client = useApolloClient()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [checkedName, setCheckedName] = useState('')
  const [error, setError] = useState('')
  const name =
    props.value.inner.kind === 'value' ? props.value.inner.value.trim() : ''

  const check = useCallback(async () => {
    if (!name) return
    setLoading(true)
    setError('')
    try {
      const { data } = await client.query({
        query: CHECK_TAG_NAME_SIMILARITY,
        variables: { name },
        fetchPolicy: 'network-only',
      })
      setResult((data?.checkTagNameSimilarity as Result | undefined) ?? null)
      setCheckedName(name)
    } catch (error: unknown) {
      setResult(null)
      setCheckedName('')
      setError(
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message: string }).message)
          : '檢查失敗，請稍後再試'
      )
    } finally {
      setLoading(false)
    }
  }, [client, name])

  const isCurrentResult = result !== null && checkedName === name
  const similarTags = isCurrentResult ? result.similarTags ?? [] : []

  return (
    <>
      <TextField {...props} />
      <FieldContainer>
        <Button onClick={check} isDisabled={!name || loading} tone="active">
          {loading ? '檢查中…' : '檢查相似標籤'}
        </Button>
        {isCurrentResult && !result.enabled && (
          <p style={{ color: '#6b7280', marginBottom: 0 }}>
            相似度檢查目前未啟用。
          </p>
        )}
        {error && <p style={{ color: '#b91c1c', marginBottom: 0 }}>{error}</p>}
        {isCurrentResult && result.enabled && similarTags.length === 0 && (
          <p style={{ color: '#166534', marginBottom: 0 }}>
            沒有找到距離低於 {result.distanceThreshold} 的相似標籤，可自行決定是否建立。
          </p>
        )}
        {isCurrentResult && result.enabled && similarTags.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p style={{ margin: '0 0 6px', color: '#92400e' }}>
              找到以下相似標籤；仍可自行決定是否建立。
            </p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {similarTags.map((tag) => (
                <li key={tag.id}>
                  {tag.name}（相似度 {(tag.similarity * 100).toFixed(1)}%，距離 {tag.distance.toFixed(3)}）
                  {tag.brief ? `：${tag.brief}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </FieldContainer>
    </>
  )
}
