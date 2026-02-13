import { list } from '@keystone-6/core'
import { text, relationship, select } from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'
import envVar from '../environment-variables'
import {
  invalidateByRoutes,
  type RoutePrefixConfig,
} from '../services/invalidate-cdn-cache'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    name: text({
      label: '名稱',
      validation: { isRequired: true },
    }),
    title: text({
      label: '標題',
    }),
    description: text({
      label: '描述',
      ui: {
        displayMode: 'textarea',
      },
    }),
    image: relationship({
      ref: 'Photo',
      label: '圖片',
    }),
    youtubeUrl: text({
      label: 'Youtube 影片',
    }),
    state: select({
      label: '狀態',
      options: [
        { label: '已發布', value: 'published' },
        { label: '預約發佈', value: 'scheduled' },
        { label: '草稿', value: 'draft' },
        { label: '已下線', value: 'archived' },
      ],
      defaultValue: 'draft',
      validation: { isRequired: true },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['name', 'state', 'title'],
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
  envVar.invalidateCDNCache.routePrefixConfig?.infoGraph
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
          [envVar.invalidateCDNCache.routePrefixConfig?.infoGraph],
          itemId
        ),
      ])
    },
  }
}

export default extendedListConfigurations
