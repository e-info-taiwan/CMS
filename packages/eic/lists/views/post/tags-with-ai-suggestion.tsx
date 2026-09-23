import React, { useCallback, useState } from 'react'
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
const APPLY_POST_TAGS = gql`
  mutation ApplyPostTagCandidates($postId: ID!, $selections: JSON!) {
    applyPostTagCandidates(postId: $postId, selections: $selections)
  }
`
type Candidate = {
  key: string
  suggestedName: string
  kind: 'featured-existing' | 'existing' | 'new'
  existingTag?: { id: string; name: string; isFeatured: boolean }
}
type SuggestPayload = {
  candidates?: Candidate[]
  targetCount?: number
  currentTagCount?: number
}
type ApplyPayload = { tags?: { id: string; name: string }[] }

const colors = {
  'featured-existing': '#eff6ff',
  existing: '#eff6ff',
  new: '#fff7ed',
}
const labels = {
  'featured-existing': '建立關聯（首頁既有標籤）',
  existing: '建立關聯（既有標籤）',
  new: '建立新標籤後關聯',
}

export function Field(props: FieldProps<typeof controller>) {
  const { value, onChange } = props
  const client = useApolloClient()
  const toasts = useToasts()
  const [suggest, { loading: suggesting }] = useMutation(SUGGEST_POST_TAGS)
  const [apply, { loading: applying }] = useMutation(APPLY_POST_TAGS)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState('')
  const itemId = value.kind === 'many' ? value.id : null

  const findSuggestions = useCallback(async () => {
    if (!itemId) return
    try {
      const { data } = await suggest({ variables: { postId: itemId } })
      const payload = data?.suggestPostTagsWithAi as SuggestPayload | undefined
      const nextCandidates = payload?.candidates ?? []
      setCandidates(nextCandidates)
      setSelected(new Set())
      setNotice(
        nextCandidates.length > 0
          ? ''
          : '沒有找到尚未連結、且與文章相關的候選標籤。'
      )
    } catch (error: unknown) {
      toasts.addToast({
        title: '建議標籤失敗',
        message: error instanceof Error ? error.message : '請稍後再試',
        tone: 'negative',
      })
    }
  }, [itemId, suggest, toasts])

  const applySelected = useCallback(async () => {
    if (!itemId || value.kind !== 'many' || !onChange || selected.size === 0)
      return
    const selections = candidates
      .filter((item) => selected.has(item.key))
      .map((item) =>
        item.existingTag
          ? { existingTagId: item.existingTag.id }
          : { name: item.suggestedName }
      )
    try {
      const { data } = await apply({
        variables: { postId: itemId, selections },
      })
      const tags =
        (data?.applyPostTagCandidates as ApplyPayload | undefined)?.tags ?? []
      const ids = new Set(value.value.map((tag) => tag.id))
      onChange({
        ...value,
        value: [
          ...value.value,
          ...tags
            .filter((tag) => !ids.has(tag.id))
            .map((tag) => ({ id: tag.id, label: tag.name })),
        ],
      })
      setCandidates([])
      setSelected(new Set())
      toasts.addToast({
        title: '已套用標籤',
        message: tags.map((tag) => tag.name).join('、'),
        tone: 'positive',
      })
      void client.refetchQueries({ include: ['ItemPage'] })
    } catch (error: unknown) {
      toasts.addToast({
        title: '套用標籤失敗',
        message: error instanceof Error ? error.message : '請稍後再試',
        tone: 'negative',
      })
    }
  }, [apply, candidates, client, itemId, onChange, selected, toasts, value])

  return (
    <>
      <RelationshipField {...props} />
      {itemId && value.kind === 'many' && (
        <div style={{ marginTop: 8 }}>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 8px' }}>
            每次會產生一組獨立候選：優先列出相關的既有標籤（藍色），再補最多 3
            個新標籤（橘色）；確認後才套用。
          </p>
          <Button
            onClick={findSuggestions}
            isDisabled={suggesting || applying}
            tone="active"
          >
            {suggesting ? '分析中…' : 'AI 產生標籤候選'}
          </Button>
          {notice && (
            <p style={{ color: '#6b7280', marginBottom: 0 }}>{notice}</p>
          )}
          {candidates.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {candidates.map((candidate) => (
                <label
                  key={candidate.key}
                  style={{
                    background: colors[candidate.kind],
                    borderRadius: 6,
                    display: 'block',
                    marginTop: 8,
                    padding: '8px 10px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(candidate.key)}
                    onChange={() =>
                      setSelected((current) => {
                        const next = new Set(current)
                        next.has(candidate.key)
                          ? next.delete(candidate.key)
                          : next.add(candidate.key)
                        return next
                      })
                    }
                  />{' '}
                  <strong>
                    {candidate.existingTag?.name ?? candidate.suggestedName}
                  </strong>{' '}
                  <span style={{ color: '#6b7280' }}>
                    ({labels[candidate.kind]})
                  </span>
                  {candidate.existingTag &&
                  candidate.existingTag.name !== candidate.suggestedName
                    ? `，取代 AI 建議「${candidate.suggestedName}」`
                    : ''}
                </label>
              ))}
              <div style={{ marginTop: 12 }}>
                <Button
                  onClick={applySelected}
                  isDisabled={selected.size === 0 || applying}
                  tone="positive"
                >
                  {applying ? '套用中…' : '套用選取的標籤'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
