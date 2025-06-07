import { list } from '@keystone-6/core'
import { relationship, timestamp } from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    member: relationship({
      ref: 'Member.favorites',
      many: false,
      label: '會員名稱',
    }),
    post: relationship({
      ref: 'Post',
      many: false,
      label: '收藏文章',
    }),
    createdAt: timestamp({
      label: '收藏時間',
      defaultValue: { kind: 'now' },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['member', 'post', 'createdAt'],
      initialSort: {
        field: 'createdAt',
        direction: 'DESC',
      },
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
})

export default utils.addTrackingFields(listConfigurations)
