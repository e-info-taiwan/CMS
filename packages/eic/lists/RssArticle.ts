import { list } from '@keystone-6/core'
import { text, timestamp } from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'
import { tagEmbeddingService, toVectorLiteral } from '../services/tag-embedding'
import envVar from '../environment-variables'

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
      ui: { views: './lists/views/rss-link' },
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
      label: '首次抓取時間',
      validation: { isRequired: true },
      defaultValue: { kind: 'now' },
    }),
    summary: text({
      label: 'RSS 內容／摘要',
      ui: {
        displayMode: 'textarea',
        description: '僅顯示 RSS 提供的文字內容；若來源只提供摘要，此處不會是文章全文。',
        views: './lists/views/rss-content',
      },
    }),
  },
  ui: {
    label: '外部媒體 RSS',
    labelField: 'title',
    searchFields: ['title', 'source', 'summary'],
    description: '最近三個月收集的外部媒體文章，可搜尋標題、媒體與 RSS 內容，或篩選來源及日期。',
    listView: {
      initialColumns: ['title', 'source', 'publishedAt', 'fetchedAt', 'summary', 'link'],
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

    if (!envVar.featureToggle.postVector) {
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
