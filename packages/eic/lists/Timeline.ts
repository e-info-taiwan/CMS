import { list, graphql } from '@keystone-6/core'
import { text, relationship, select, virtual } from '@keystone-6/core/fields'
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
    description: text({
      label: '描述',
      ui: {
        displayMode: 'textarea',
      },
    }),
    // TODO: check required condition
    items: relationship({
      ref: 'TimelineItem',
      many: true,
      label: '關聯事件',
    }),
    sortOrder: select({
      label: '時間排序',
      type: 'string',
      options: [
        { label: '升冪', value: 'asc' },
        { label: '降冪', value: 'desc' },
      ],
      defaultValue: 'asc',
      validation: { isRequired: true },
    }),
    embedCode: virtual({
      field: graphql.field({
        type: graphql.String,
        async resolve(item, args, context): Promise<string> {
          // 查詢當前 Timeline 及其關聯的 TimelineItem
          const timeline = await context.query.Timeline.findOne({
            where: { id: String(item.id) },
            query: `
              id
              sortOrder
              items {
                id
                title
                content
                eventTime
                timeFormat
                image {
                  resized {
                    w480
                  }
                }
                imageCaption
              }
            `,
          })

          if (
            !timeline ||
            !Array.isArray(timeline.items) ||
            timeline.items.length === 0
          ) {
            return ''
          }

          // 依 sortOrder 決定時間排序（預設升冪）
          const sortOrder =
            String(timeline.sortOrder) === 'desc' ? 'desc' : 'asc'
          const items = [...timeline.items].sort((a, b) => {
            const aTime = a?.eventTime ? new Date(a.eventTime).getTime() : 0
            const bTime = b?.eventTime ? new Date(b.eventTime).getTime() : 0
            return sortOrder === 'asc' ? aTime - bTime : bTime - aTime
          })

          const escapeHtml = (str: unknown): string => {
            if (typeof str !== 'string') return ''
            return str
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
          }

          const formatDate = (
            iso: string | null | undefined,
            format: string | null | undefined
          ): string => {
            if (!iso) return ''
            const d = new Date(iso)
            if (Number.isNaN(d.getTime())) return ''

            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')

            switch (format) {
              case 'year':
                return `${y}`
              case 'month':
                return `${y}-${m}`
              case 'day':
              default:
                return `${y}-${m}-${day}`
            }
          }

          const itemHtml = items
            .map((it) => {
              const dateText = formatDate(it.eventTime, it.timeFormat)
              const title = escapeHtml(it.title)
              const body = escapeHtml(it.content)

              const imageUrl = it.image?.resized?.w480 || ''
              const imageCaption = escapeHtml(it.imageCaption)

              const imageBlock = imageUrl
                ? `
        <div class="timeline-image">
            <img src="${imageUrl}" alt="${title}">
            <div class="timeline-image-caption">${imageCaption}</div>
        </div>`
                : ''

              const bodyBlock = body
                ? `
            <div class="timeline-body">
                <p>${body}</p>
            </div>`
                : ''

              return `
    <div class="timeline-item">
        <div class="timeline-content">
            <div class="timeline-date">${escapeHtml(dateText)}</div>
            <h2 class="timeline-headline">${title}</h2>${bodyBlock}
        </div>${imageBlock}
    </div>`
            })
            .join('\n')

          const html = `<div class="timeline">
${itemHtml}
</div>`

          return html
        },
      }),
      label: '嵌入碼',
    }),
  },
  ui: {
    listView: {
      initialColumns: ['name', 'sortOrder', 'items'],
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
  envVar.invalidateCDNCache.routePrefixConfig?.timeline
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
          [envVar.invalidateCDNCache.routePrefixConfig?.timeline],
          itemId
        ),
      ])
    },
  }
}

export default extendedListConfigurations
