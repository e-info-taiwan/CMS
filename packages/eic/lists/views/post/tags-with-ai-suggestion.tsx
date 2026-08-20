import React, { useCallback } from 'react'
import { Button } from '@keystone-ui/button'
import { useToasts } from '@keystone-ui/toast'
import {
  gql,
  useApolloClient,
  useMutation,
} from '@keystone-6/core/admin-ui/apollo'
import type { FieldProps } from '@keystone-6/core/types'
import {
  CardValue,
  Cell,
  controller,
  Field as RelationshipField,
} from '@keystone-6/core/fields/types/relationship/views'

export { CardValue, Cell, controller }

const SUGGEST_POST_TAGS = gql`
  mutation SuggestPostTagsWithAi($postId: ID!) {
    suggestPostTagsWithAi(postId: $postId)
  }
`

type SuggestPayload = {
  tags?: { id: string; name: string }[]
}

/**
 * Keeps the AI action in the relationship field so it can update the same
 * form value that Keystone serializes when the article is saved.
 */
export function Field(props: FieldProps<typeof controller>) {
  const { value, onChange } = props
  const client = useApolloClient()
  const toasts = useToasts()
  const [mutate, { loading }] = useMutation(SUGGEST_POST_TAGS)

  const itemId = value.kind === 'many' ? value.id : null

  const run = useCallback(async () => {
    if (!itemId || value.kind !== 'many' || !onChange) return

    try {
      const { data } = await mutate({ variables: { postId: itemId } })
      const payload = data?.suggestPostTagsWithAi as SuggestPayload | undefined
      const suggestedTags = payload?.tags ?? []
      const existingIds = new Set(value.value.map((tag) => tag.id))
      const newTags = suggestedTags
        .filter((tag) => !existingIds.has(tag.id))
        .map((tag) => ({ id: tag.id, label: tag.name }))

      onChange({
        ...value,
        value: [...value.value, ...newTags],
      })

      const names = suggestedTags.map((tag) => tag.name).join('、')
      toasts.addToast({
        title: '已套用標籤',
        message: names ? `已連結：${names}` : '完成',
        tone: 'positive',
      })

      // Keep Keystone's form baseline in sync with the mutation's direct DB
      // write. The field has already been updated above, so a refresh failure
      // cannot hide the applied tags or turn this success into an error.
      void client.refetchQueries({ include: ['ItemPage'] }).catch((error) => {
        console.warn('[ai-tag-suggestion] ItemPage refresh failed', error)
      })
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message: string }).message)
          : '請稍後再試'
      toasts.addToast({
        title: '建議標籤失敗',
        message,
        tone: 'negative',
      })
    }
  }, [client, itemId, mutate, onChange, toasts, value])

  return (
    <>
      <RelationshipField {...props} />
      {itemId && value.kind === 'many' && (
        <div style={{ marginTop: 8 }}>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 8px' }}>
            依內文呼叫 Gemini 產生 3〜5 個標籤，並合併到此欄位。
          </p>
          <Button onClick={run} isDisabled={loading || onChange === undefined} tone="active">
            {loading ? '處理中…' : 'AI 建議並套用標籤'}
          </Button>
        </div>
      )}
    </>
  )
}
