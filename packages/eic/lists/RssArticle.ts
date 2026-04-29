import { list } from '@keystone-6/core'
import { text, timestamp } from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'
import { tagEmbeddingService, toVectorLiteral } from '../services/tag-embedding'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    source: text({
      label: '媒體來源',
      validation: { isRequired: true },
    }),
    title: text({
      label: '標題',
      validation: { isRequired: true },
    }),
    link: text({
      label: '原文連結',
      isIndexed: 'unique',
      validation: { isRequired: true },
    }),
    guid: text({
      label: 'RSS GUID',
      db: { isNullable: true },
    }),
    publishedAt: timestamp({
      label: '發布時間',
      db: { isNullable: true },
    }),
    fetchedAt: timestamp({
      label: '抓取時間',
      validation: { isRequired: true },
      defaultValue: { kind: 'now' },
    }),
    summary: text({
      label: '摘要',
      ui: { displayMode: 'textarea' },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['id', 'source', 'title', 'publishedAt', 'fetchedAt'],
      initialSort: { field: 'fetchedAt', direction: 'DESC' },
      pageSize: 50,
    },
  },
  access: {
    operation: {
      query: allowRoles(admin, moderator, editor),
      update: allowRoles(admin, moderator, editor),
      create: allowRoles(admin, moderator, editor),
      delete: allowRoles(admin),
    },
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

    const rssArticleId = Number(item?.id ?? originalItem?.id)
    if (!Number.isFinite(rssArticleId)) {
      return
    }

    const currentTitle = String(item?.title ?? '').trim()
    const previousTitle = String(originalItem?.title ?? '').trim()
    const shouldRefreshEmbedding =
      operation === 'create' || currentTitle !== previousTitle
    if (!shouldRefreshEmbedding) {
      return
    }

    if (!currentTitle) {
      await context.prisma.$executeRawUnsafe(
        'UPDATE "RssArticle" SET "titleEmbedding" = NULL WHERE id = $1',
        rssArticleId
      )
      return
    }

    try {
      const embedding = await tagEmbeddingService.generateVertexEmbedding(
        currentTitle
      )
      await context.prisma.$executeRawUnsafe(
        `UPDATE "RssArticle"
         SET "titleEmbedding" = CAST($1 AS vector)
         WHERE id = $2`,
        toVectorLiteral(embedding),
        rssArticleId
      )
    } catch (error) {
      console.error(
        `[RssArticle title embedding] failed to refresh embedding for RssArticle ${rssArticleId}`,
        error
      )
    }
  },
}

export default extendedListConfigurations
