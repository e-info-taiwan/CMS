import React, { useCallback } from 'react'
import { FieldContainer, FieldLabel } from '@keystone-ui/fields'
import { Button } from '@keystone-ui/button'
import {
  gql,
  useApolloClient,
  useMutation,
} from '@keystone-6/core/admin-ui/apollo'
import { useToasts } from '@keystone-ui/toast'

const SUGGEST_POST_TAGS = gql`
  mutation SuggestPostTagsWithAi($postId: ID!) {
    suggestPostTagsWithAi(postId: $postId)
  }
`

type SuggestPayload = {
  tags?: { id: string; name: string }[]
  geminiSuggestions?: string[]
}

export function Field() {
  const client = useApolloClient()
  const toasts = useToasts()
  const [mutate, { loading }] = useMutation(SUGGEST_POST_TAGS)

  const isCreate =
    typeof window !== 'undefined' &&
    window.location.pathname.endsWith('/create')
  const itemId =
    typeof window !== 'undefined'
      ? window.location.pathname.split('/').pop()
      : null

  const run = useCallback(async () => {
    if (!itemId) return
    try {
      const { data } = await mutate({ variables: { postId: itemId } })
      const payload = data?.suggestPostTagsWithAi as SuggestPayload | undefined
      const names = payload?.tags?.map((t) => t.name).join('、') ?? ''
      toasts.addToast({
        title: '已套用標籤',
        message: names ? `已連結：${names}` : '完成',
        tone: 'positive',
      })
      try {
        client.cache.evict({
          id: client.cache.identify({ __typename: 'Post', id: itemId }),
          fieldName: 'tags',
        })
        client.cache.gc()
      } catch (e) {
        console.warn('[ai-tag-suggestion] cache evict', e)
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: string }).message)
          : '請稍後再試'
      toasts.addToast({
        title: '建議標籤失敗',
        message: msg,
        tone: 'negative',
      })
    }
  }, [client, itemId, mutate, toasts])

  if (isCreate || !itemId) {
    return (
      <FieldContainer>
        <FieldLabel>AI 建議標籤</FieldLabel>
        <p style={{ color: '#6b7280', margin: 0 }}>
          請先儲存文章後，再使用此功能。
        </p>
      </FieldContainer>
    )
  }

  return (
    <FieldContainer>
      <FieldLabel>AI 建議標籤</FieldLabel>
      <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 8px' }}>
        依內文呼叫 Gemini 產生 3〜5
        個標籤；會比對既有標籤向量，相近者沿用舊標籤並連結至此文章。
      </p>
      <Button onClick={run} isDisabled={loading} tone="active">
        {loading ? '處理中…' : '一鍵建議並套用標籤'}
      </Button>
    </FieldContainer>
  )
}
