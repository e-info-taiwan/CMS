import { list } from '@keystone-6/core'
import {
  text,
  relationship,
  select,
  checkbox,
  integer,
} from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'
import envVar from '../environment-variables'
import {
  invalidateByRoutes,
  type RoutePrefixConfig,
} from '../services/invalidate-cdn-cache'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    title: text({
      label: '標題',
      validation: { isRequired: true },
    }),
    status: select({
      label: '狀態',
      type: 'string',
      options: [
        { label: '已發布', value: 'published' },
        { label: '草稿', value: 'draft' },
        { label: '已下線', value: 'archived' },
        { label: '前台不可見', value: 'invisible' },
      ],
      defaultValue: 'draft',
      validation: { isRequired: true },
    }),
    content: text({
      label: '專題內容',
      ui: {
        displayMode: 'textarea',
      },
    }),
    authorInfo: text({
      label: '專題作者資訊',
      ui: {
        displayMode: 'textarea',
      },
    }),
    redirectUrl: text({
      label: '轉址網址',
      ui: {
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
        listView: { fieldMode: 'hidden' },
      },
    }),
    heroImage: relationship({
      ref: 'Photo',
      label: '首圖',
    }),
    posts: relationship({
      ref: 'Post.topic',
      label: '專題關聯的文章',
      many: true,
    }),
    tags: relationship({
      ref: 'Tag.topics',
      label: '標籤',
      many: true,
    }),
    isPinned: checkbox({
      label: '置頂',
      defaultValue: false,
    }),
    sortOrder: integer({
      label: '排序',
      defaultValue: 0,
    }),
  },
  ui: {
    listView: {
      initialColumns: ['title', 'status', 'isPinned', 'sortOrder'],
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
  graphql: {
    cacheHint: { maxAge: 1200, scope: 'PUBLIC' },
  },
})

const extendedListConfigurations = utils.addTrackingFields(listConfigurations)

if (
  envVar.invalidateCDNCache.projectId &&
  envVar.invalidateCDNCache.urlMapName &&
  envVar.invalidateCDNCache.routePrefixConfig?.topic
) {
  const originalAfterOperation =
    extendedListConfigurations.hooks?.afterOperation

  extendedListConfigurations.hooks = {
    ...extendedListConfigurations.hooks,
    afterOperation: async ({ item, originalItem }) => {
      const itemId = (originalItem?.id ?? item?.id) as
        | string
        | number
        | undefined
      await Promise.allSettled([
        originalAfterOperation?.({ item, originalItem } as Parameters<
          NonNullable<typeof originalAfterOperation>
        >[0]),
        invalidateByRoutes(
          {
            projectId: envVar.invalidateCDNCache.projectId,
            urlMapName: envVar.invalidateCDNCache.urlMapName,
            routePrefixConfig: envVar.invalidateCDNCache
              .routePrefixConfig as RoutePrefixConfig,
          },
          [envVar.invalidateCDNCache.routePrefixConfig.topic],
          itemId
        ),
      ])
    },
  }
}

export default extendedListConfigurations
