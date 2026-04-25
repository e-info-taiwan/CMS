// @ts-ignore: no definition
import { utils } from '@mirrormedia/lilith-core'
import { list } from '@keystone-6/core'
import { Prisma } from '@prisma/client'
import { relationship, checkbox, integer, text } from '@keystone-6/core/fields'
import {
  tagEmbeddingService,
  toVectorLiteral,
  SimilarTag,
} from '../services/tag-embedding'
import envVar from '../environment-variables'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const formatSimilarTagMessage = (tags: SimilarTag[]) => {
  const tagNames = tags
    .slice(0, 3)
    .map(
      (tag) =>
        `「${tag.name}」（相似度 ${Math.round(tag.similarity * 1000) / 10}%）`
    )
    .join('、')

  return `已有相似標籤：${tagNames}。請優先使用既有標籤，或調整標籤名稱後再新增。`
}

const listConfigurations = list({
  fields: {
    name: text({
      isIndexed: 'unique',
      label: '標籤名稱',
      validation: { isRequired: true },
    }),
    checkSimilarity: checkbox({
      label: '檢查相似標籤',
      defaultValue: true,
      ui: {
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

    if (
      !envVar.tagEmbedding.similarityCheck.enabled ||
      (operation !== 'create' && operation !== 'update')
    ) {
      return
    }

    if (resolvedData.checkSimilarity === false) {
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
      const embedding = await tagEmbeddingService.generateVertexEmbedding(
        currentName
      )
      const tagId = Number(item?.id)
      const similarTags = await tagEmbeddingService.findSimilarTags({
        prisma: context.prisma,
        embedding,
        excludeId: Number.isFinite(tagId) ? tagId : undefined,
      })
      const tooSimilarTags = similarTags.filter(
        (tag) =>
          tag.distance <= envVar.tagEmbedding.similarityCheck.distanceThreshold
      )

      if (tooSimilarTags.length > 0) {
        addValidationError(formatSimilarTagMessage(tooSimilarTags))
      }
    } catch (error) {
      console.error('[Tag embedding] failed to validate similar tags', error)
      addValidationError(
        '無法檢查相似標籤，請稍後再試；若持續發生，請聯繫管理員確認 Vertex AI 設定。'
      )
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

    const tagId = Number(item?.id ?? originalItem?.id)
    const currentName = String(item?.name ?? '').trim()
    const previousName = String(originalItem?.name ?? '').trim()
    const shouldRefreshEmbedding =
      operation === 'create' || currentName !== previousName
    const shouldResetSimilarityCheck = item?.checkSimilarity === false

    if (!Number.isFinite(tagId)) {
      return
    }

    if (shouldResetSimilarityCheck) {
      await context.prisma.$executeRawUnsafe(
        'UPDATE "Tag" SET "checkSimilarity" = true WHERE id = $1',
        tagId
      )
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
