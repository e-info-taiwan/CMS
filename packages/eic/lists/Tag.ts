// @ts-ignore: no definition
import { utils } from '@mirrormedia/lilith-core'
import { list } from '@keystone-6/core'
import { Prisma } from '@prisma/client'
import { relationship, checkbox, integer, text } from '@keystone-6/core/fields'
import { tagEmbeddingService } from '../services/tag-embedding'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const toVectorLiteral = (values: number[] | null) => {
  if (!values) {
    return null
  }

  return `[${values.join(',')}]`
}

const listConfigurations = list({
  fields: {
    name: text({
      isIndexed: 'unique',
      label: '標籤名稱',
      validation: { isRequired: true },
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

const originalAfterOperation = extendedListConfigurations.hooks?.afterOperation

extendedListConfigurations.hooks = {
  ...extendedListConfigurations.hooks,
  afterOperation: async ({ operation, item, originalItem, context }) => {
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

    if (!Number.isFinite(tagId) || !shouldRefreshEmbedding) {
      return
    }

    if (!currentName) {
      await context.prisma.$executeRawUnsafe(
        'UPDATE "Tag" SET "textEmbedding3Small" = NULL, "bgeM3Embedding" = NULL WHERE id = $1',
        tagId
      )
      return
    }

    try {
      const embeddings = await tagEmbeddingService.generate(currentName)

      await context.prisma.$executeRawUnsafe(
        `UPDATE "Tag"
         SET "textEmbedding3Small" = CAST($1 AS vector),
             "bgeM3Embedding" = CAST($2 AS vector)
         WHERE id = $3`,
        toVectorLiteral(embeddings.textEmbedding3Small),
        toVectorLiteral(embeddings.bgeM3Embedding),
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
