// @ts-ignore: no definition
import { utils } from '@mirrormedia/lilith-core'
import { list } from '@keystone-6/core'
import { Prisma } from '@prisma/client'
import { relationship, checkbox, integer, text } from '@keystone-6/core/fields'
import {
  tagEmbeddingService,
  toVectorLiteral,
} from '../services/tag-embedding'
import envVar from '../environment-variables'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const formatDuplicateTagMessage = (tag: { id: number; name: string }) =>
  `已有相同名稱的標籤「${tag.name}」（ID: ${tag.id}），請改用既有標籤或更換名稱。`

const listConfigurations = list({
  fields: {
    name: text({
      isIndexed: 'unique',
      label: '標籤名稱',
      validation: { isRequired: true },
      ui: {
        views: './lists/views/tag-name-similarity-check',
      },
    }),
    checkSimilarity: checkbox({
      label: '檢查相似標籤',
      defaultValue: true,
      ui: {
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
        listView: { fieldMode: 'hidden' },
      },
    }),
    brief: text({
      label: '標籤內容',
    }),
    heroImage: relationship({
      ref: 'Photo',
      label: '標題頁首圖',
    }),
    isFeatured: checkbox({
      label: '是否顯示在首頁',
    }),
    sortOrder: integer({
      label: '排序',
    }),
    posts: relationship({
      ref: 'Post.tags',
      many: true,
      label: '相關文章',
      ui: {
        listView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
      },
    }),
    photos: relationship({
      ref: 'Photo.tags',
      many: true,
      label: '相關圖片',
      ui: {
        listView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
      },
    }),
  },
  access: {
    operation: {
      query: allowRoles(admin, moderator, editor),
      update: allowRoles(admin, moderator, editor),
      create: allowRoles(admin, moderator, editor),
      delete: allowRoles(admin),
    },
  },
  graphql: {
    cacheHint: { maxAge: 1200, scope: 'PUBLIC' },
  },
})

const extendedListConfigurations = utils.addTrackingFields(listConfigurations)

const originalValidateInput = extendedListConfigurations.hooks?.validateInput
const originalAfterOperation = extendedListConfigurations.hooks?.afterOperation
type TagHookContext = {
  prisma: {
    $queryRawUnsafe<T = unknown>(
      query: string,
      ...values: unknown[]
    ): Promise<T>
    $executeRawUnsafe(query: string, ...values: unknown[]): Promise<unknown>
  }
}
type DuplicateTag = {
  id: number
  name: string
}
type ValidateInputArgs = {
  operation: string
  item?: Record<string, unknown>
  resolvedData: Record<string, unknown>
  addValidationError: (message: string) => void
  context: TagHookContext
}
type AfterOperationArgs = {
  operation: string
  item?: Record<string, unknown>
  originalItem?: Record<string, unknown>
  context: TagHookContext
}

extendedListConfigurations.hooks = {
  ...extendedListConfigurations.hooks,
  validateInput: async (args: ValidateInputArgs) => {
    const { operation, item, resolvedData, addValidationError, context } = args
    await originalValidateInput?.({
      operation,
      item,
      resolvedData,
      addValidationError,
      context,
    } as Parameters<NonNullable<typeof originalValidateInput>>[0])

    if (operation !== 'create' && operation !== 'update') {
      return
    }

    const hasNameInput = Object.prototype.hasOwnProperty.call(
      resolvedData,
      'name'
    )
    if (operation === 'update' && !hasNameInput) {
      return
    }

    const currentName = String(resolvedData.name ?? item?.name ?? '').trim()
    const previousName = String(item?.name ?? '').trim()
    const shouldCheckSimilarity =
      operation === 'create' || currentName !== previousName

    if (!currentName || !shouldCheckSimilarity) {
      return
    }

    try {
      const tagId = Number(item?.id)
      const duplicateTags = await context.prisma.$queryRawUnsafe<
        DuplicateTag[]
      >(
        `SELECT id, name
         FROM "Tag"
         WHERE name = $1
           AND ($2::integer IS NULL OR id != $2::integer)
         LIMIT 1`,
        currentName,
        Number.isFinite(tagId) ? tagId : null
      )

      if (duplicateTags.length > 0) {
        addValidationError(formatDuplicateTagMessage(duplicateTags[0]))
        return
      }
    } catch (error) {
      console.error('[Tag] failed to validate duplicate tag name', error)
      addValidationError('無法檢查標籤名稱是否重複，請稍後再試。')
      return
    }

  },
  afterOperation: async (args: AfterOperationArgs) => {
    const { operation, item, originalItem, context } = args
    await originalAfterOperation?.({
      operation,
      item,
      originalItem,
      context,
    } as Parameters<NonNullable<typeof originalAfterOperation>>[0])

    if (operation !== 'create' && operation !== 'update') {
      return
    }

    if (!envVar.featureToggle.tagVector) {
      return
    }

    const tagId = Number(item?.id ?? originalItem?.id)
    const currentName = String(item?.name ?? '').trim()
    const previousName = String(originalItem?.name ?? '').trim()
    const shouldRefreshEmbedding =
      operation === 'create' || currentName !== previousName

    if (!Number.isFinite(tagId)) {
      return
    }

    if (!shouldRefreshEmbedding) {
      return
    }

    if (!currentName) {
      await context.prisma.$executeRawUnsafe(
        'UPDATE "Tag" SET "textEmbedding3Small" = NULL WHERE id = $1',
        tagId
      )
      return
    }

    try {
      const embeddings = await tagEmbeddingService.generate(currentName)

      await context.prisma.$executeRawUnsafe(
        `UPDATE "Tag"
         SET "textEmbedding3Small" = CAST($1 AS vector)
         WHERE id = $2`,
        toVectorLiteral(embeddings.textEmbedding3Small),
        tagId
      )
    } catch (error) {
      console.error(
        `[Tag embedding] failed to refresh embeddings for Tag ${tagId}`,
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.message
          : error
      )
    }
  },
}

export default extendedListConfigurations
