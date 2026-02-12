import { list } from '@keystone-6/core'
import { relationship, select } from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    newsletterName: select({
      label: '電子報名稱',
      type: 'enum',
      options: [
        { label: '每日報', value: 'daily' },
        { label: '一週回顧', value: 'weekly' },
      ],
      defaultValue: 'daily',
    }),
    newsletterType: select({
      label: '電子報類型',
      type: 'enum',
      options: [
        { label: '一般版', value: 'standard' },
        { label: '美化版', value: 'styled' },
      ],
      defaultValue: 'standard',
    }),
    member: relationship({
      ref: 'Member.subscriptions',
      label: '訂閱會員',
      many: false,
    }),
    status: select({
      label: '狀態',
      type: 'enum',
      options: [
        { label: '訂閱', value: 'active' },
        { label: '退訂', value: 'disable' },
      ],
      defaultValue: 'active',
    }),
  },
  ui: {
    listView: {
      initialColumns: ['member', 'newsletterName', 'newsletterType', 'status'],
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
  graphql: {
    cacheHint: { maxAge: 1200, scope: 'PUBLIC' },
  },
})

export default utils.addTrackingFields(listConfigurations)
