import { list, graphql } from '@keystone-6/core'
import { text, relationship, select, virtual } from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

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
        resolve(item): string {
          // 生成 block key（基於 item.id，確保每次查詢相同 Timeline 時 key 一致）
          const blockKey = `timeline-${item.id}`

          // 創建符合 draft.js 格式的嵌入碼
          const embedCode = {
            blocks: [
              {
                key: blockKey,
                text: ' ',
                type: 'atomic',
                depth: 0,
                inlineStyleRanges: [],
                entityRanges: [
                  {
                    offset: 0,
                    length: 1,
                    key: 0,
                  },
                ],
                data: {},
              },
            ],
            entityMap: {
              '0': {
                type: 'TIMELINE',
                mutability: 'IMMUTABLE',
                data: {
                  id: String(item.id),
                },
              },
            },
          }

          return JSON.stringify(embedCode)
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

export default utils.addTrackingFields(listConfigurations)
