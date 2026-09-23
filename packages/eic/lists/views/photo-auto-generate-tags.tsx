import React, { useCallback } from 'react'
import { FieldContainer, FieldLabel } from '@keystone-ui/fields'
import { Button } from '@keystone-ui/button'
import {
  gql,
  useApolloClient,
  useMutation,
} from '@keystone-6/core/admin-ui/apollo'
import { useToasts } from '@keystone-ui/toast'
import {
  CardValueComponent,
  CellComponent,
  FieldController,
  FieldControllerConfig,
  FieldProps,
} from '@keystone-6/core/types'

const APPLY_PHOTO_TAGS_MUTATION = gql`
  mutation ApplyPhotoImageLabelTags($photoId: ID!) {
    applyPhotoImageLabelTags(photoId: $photoId)
  }
`

type AutoGenerateTagsValue = {
  photoId?: string
}

type ApplyPhotoTagsPayload = {
  appliedTags?: { id: string; name: string }[]
  skippedExistingTags?: { id: string; name: string }[]
}

type ButtonProps = {
  photoId: string
  compact?: boolean
}

const formatTags = (tags: { name: string }[] | undefined) =>
  tags && tags.length > 0 ? tags.map((tag) => tag.name).join('、') : ''

function getErrorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error
    ? String((error as { message: string }).message)
    : '請稍後再試'
}

function AutoGenerateTagsButton({ photoId, compact = false }: ButtonProps) {
  const client = useApolloClient()
  const toasts = useToasts()
  const [mutate, { loading }] = useMutation(APPLY_PHOTO_TAGS_MUTATION)

  const run = useCallback(
    async (event?: React.MouseEvent) => {
      event?.preventDefault()
      event?.stopPropagation()
      if (!photoId) return

      try {
        const { data } = await mutate({ variables: { photoId } })
        const payload = data?.applyPhotoImageLabelTags as
          | ApplyPhotoTagsPayload
          | undefined
        const appliedNames = formatTags(payload?.appliedTags)
        const skippedNames = formatTags(payload?.skippedExistingTags)

        toasts.addToast({
          title: appliedNames ? '已自動生成標籤' : '沒有新的標籤可套用',
          message:
            appliedNames ||
            (skippedNames ? `已存在：${skippedNames}` : '沒有匹配的既有標籤'),
          tone: appliedNames ? 'positive' : 'help',
        })
        await client.refetchQueries({ include: 'active' })
      } catch (error: unknown) {
        toasts.addToast({
          title: '自動生成標籤失敗',
          message: getErrorMessage(error),
          tone: 'negative',
        })
      }
    },
    [client, mutate, photoId, toasts]
  )

  return (
    <Button
      size={compact ? 'small' : 'medium'}
      tone="active"
      onClick={run}
      isDisabled={loading || !photoId}
    >
      {loading ? '處理中…' : '自動生成標籤'}
    </Button>
  )
}

const getPhotoIdFromValue = (value: unknown) =>
  value && typeof value === 'object' && 'photoId' in value
    ? String((value as AutoGenerateTagsValue).photoId ?? '')
    : ''

export const Field = ({ field, value }: FieldProps<typeof controller>) => {
  const photoId = getPhotoIdFromValue(value)
  if (!photoId) {
    return null
  }

  return (
    <FieldContainer>
      <FieldLabel>{field.label}</FieldLabel>
      <AutoGenerateTagsButton photoId={photoId} />
    </FieldContainer>
  )
}

export const Cell: CellComponent<typeof controller> = ({ item, field }) => {
  const photoId = String(item.id ?? getPhotoIdFromValue(item[field.path]))
  if (!photoId) {
    return null
  }

  return <AutoGenerateTagsButton photoId={photoId} compact />
}

export const CardValue: CardValueComponent<typeof controller> = ({
  item,
  field,
}) => {
  const photoId = String(item.id ?? getPhotoIdFromValue(item[field.path]))
  if (!photoId) {
    return null
  }

  return (
    <FieldContainer>
      <FieldLabel>{field.label}</FieldLabel>
      <AutoGenerateTagsButton photoId={photoId} compact />
    </FieldContainer>
  )
}

export const controller = (
  config: FieldControllerConfig<{ query: string }>
): FieldController<AutoGenerateTagsValue | null> => ({
  path: config.path,
  label: config.label,
  description: config.description,
  graphqlSelection: `${config.path}${config.fieldMeta.query}`,
  defaultValue: null,
  deserialize: (data) => data[config.path] ?? null,
  serialize: () => ({}),
})
