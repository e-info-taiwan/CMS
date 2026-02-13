import { list } from '@keystone-6/core'
import { text, relationship, select } from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'
import envVar from '../environment-variables'
import {
  invalidateByRoutes,
  invalidatePostCdnCache,
  type RoutePrefixConfig,
} from '../services/invalidate-cdn-cache'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    name: text({
      label: '名稱',
      validation: { isRequired: true },
    }),
    content: text({
      label: '投票內容',
      validation: { isRequired: true },
      ui: {
        displayMode: 'textarea',
      },
    }),
    option1: text({
      label: '投票選項1',
    }),
    option1Image: relationship({
      ref: 'Photo',
      label: '投票選項1圖示',
    }),
    option2: text({
      label: '投票選項2',
    }),
    option2Image: relationship({
      ref: 'Photo',
      label: '投票選項2圖示',
    }),
    option3: text({
      label: '投票選項3',
    }),
    option3Image: relationship({
      ref: 'Photo',
      label: '投票選項3圖示',
    }),
    option4: text({
      label: '投票選項4',
    }),
    option4Image: relationship({
      ref: 'Photo',
      label: '投票選項4圖示',
    }),
    option5: text({
      label: '投票選項5',
    }),
    option5Image: relationship({
      ref: 'Photo',
      label: '投票選項5圖示',
    }),
    posts: relationship({
      ref: 'Post.poll',
      many: true,
      label: '相關文章',
    }),
    newsletters: relationship({
      ref: 'Newsletter.poll',
      many: true,
      label: '相關電子報',
    }),
    status: select({
      label: '狀態',
      type: 'string',
      options: [
        { label: '啟用', value: 'active' },
        { label: '停用', value: 'inactive' },
      ],
      defaultValue: 'active',
      validation: { isRequired: true },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['name', 'content', 'status'],
      pageSize: 50,
    },
  },
  access: {
    operation: {
      query: () => true, // 允許匿名查詢投票內容
      update: allowRoles(admin, moderator, editor),
      create: allowRoles(admin, moderator, editor),
      delete: allowRoles(admin),
    },
  },
})

const extendedListConfigurations = utils.addTrackingFields(listConfigurations)

if (
  envVar.invalidateCDNCache.projectId &&
  envVar.invalidateCDNCache.urlMapName &&
  (envVar.invalidateCDNCache.routePrefixConfig?.poll ||
    envVar.invalidateCDNCache.routePrefixConfig?.post ||
    envVar.invalidateCDNCache.routePrefixConfig?.newsletter)
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
      const config = {
        projectId: envVar.invalidateCDNCache.projectId,
        urlMapName: envVar.invalidateCDNCache.urlMapName,
        routePrefixConfig: envVar.invalidateCDNCache
          .routePrefixConfig as RoutePrefixConfig,
      }

      const tasks: Promise<unknown>[] = []

      if (config.routePrefixConfig?.poll) {
        tasks.push(
          invalidateByRoutes(config, [config.routePrefixConfig.poll], itemId)
        )
      }

      if (itemId && config.routePrefixConfig?.post) {
        const pollId = Number(itemId)
        const relatedPosts = await context.prisma.Post.findMany({
          where: { poll: { id: { equals: pollId } } },
          select: { id: true },
        })
        for (const post of relatedPosts) {
          tasks.push(invalidatePostCdnCache(config, post.id))
        }
      }

      if (itemId && config.routePrefixConfig?.newsletter) {
        const pollId = Number(itemId)
        const relatedNewsletters = await context.prisma.Newsletter.findMany({
          where: { poll: { id: { equals: pollId } } },
          select: { id: true },
        })
        for (const newsletter of relatedNewsletters) {
          tasks.push(
            invalidateByRoutes(
              config,
              [config.routePrefixConfig.newsletter],
              newsletter.id
            )
          )
        }
      }

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
