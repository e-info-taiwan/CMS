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
    title: text({
      label: '事件標題',
      validation: { isRequired: true },
    }),
    eventTime: text({
      label: '事件時間',
      validation: {
        isRequired: true,
        match: {
          regex: /^\d{4}\/\d{1,2}\/\d{1,2}$/,
          explanation: '請輸入 yyyy/mm/dd 格式，例如：2024/01/15',
        },
      },
      ui: {
        description: '格式：yyyy/mm/dd，例如 2024/01/15',
      },
    }),
    timeFormat: select({
      label: '前端時間字串',
      type: 'string',
      options: [
        { label: '年', value: 'year' },
        { label: '月', value: 'month' },
        { label: '日', value: 'day' },
      ],
      defaultValue: 'day',
      validation: { isRequired: true },
    }),
    content: text({
      label: '內文',
      ui: {
        displayMode: 'textarea',
      },
    }),
    image: relationship({
      ref: 'Photo',
      label: '圖片',
    }),
    imageCaption: text({
      label: '圖說',
      ui: {
        displayMode: 'textarea',
      },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['title', 'eventTime', 'timeFormat'],
      pageSize: 50,
    },
  },
  access: {
    operation: {
      query: allowRoles(admin, moderator, editor),
      update: allowRoles(admin, moderator),
      create: allowRoles(admin, moderator),
      delete: allowRoles(admin),
    },
  },
  hooks: {
    validateInput: async ({ resolvedData, addValidationError }) => {
      const eventTime = resolvedData.eventTime
      if (eventTime && /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(eventTime)) {
        const [y, m, d] = eventTime.split('/').map(Number)
        const date = new Date(y, m - 1, d)
        if (
          date.getFullYear() !== y ||
          date.getMonth() !== m - 1 ||
          date.getDate() !== d
        ) {
          addValidationError('請輸入有效的日期')
        }
      }
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
  envVar.invalidateCDNCache.routePrefixConfig?.timeline
) {
  const originalAfterOperation =
    extendedListConfigurations.hooks?.afterOperation

  extendedListConfigurations.hooks = {
    ...extendedListConfigurations.hooks,
    afterOperation: async ({ item, originalItem, context }) => {
      const itemId = (originalItem?.id ?? item?.id) as
        | string
        | number
        | undefined
      if (!itemId) {
        await originalAfterOperation?.({
          item,
          originalItem,
          context,
        } as Parameters<NonNullable<typeof originalAfterOperation>>[0])
        return
      }

      const timelineIds = await context.prisma.Timeline.findMany({
        where: { items: { some: { id: { equals: Number(itemId) } } } },
        select: { id: true },
      })

      const config = {
        projectId: envVar.invalidateCDNCache.projectId,
        urlMapName: envVar.invalidateCDNCache.urlMapName,
        routePrefixConfig: envVar.invalidateCDNCache
          .routePrefixConfig as RoutePrefixConfig,
      }

      const tasks = timelineIds.map((timeline) =>
        invalidateByRoutes(
          config,
          [config.routePrefixConfig.timeline],
          timeline.id
        )
      )

      await Promise.allSettled([
        originalAfterOperation?.({ item, originalItem, context } as Parameters<
          NonNullable<typeof originalAfterOperation>
        >[0]),
        ...tasks,
      ])
    },
  }
}

export default extendedListConfigurations
