import { list } from '@keystone-6/core'
import { relationship, timestamp, integer } from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    poll: relationship({
      ref: 'Poll',
      label: '投票工具名稱',
      many: false,
    }),
    member: relationship({
      ref: 'Member',
      label: '會員',
    }),
    post: relationship({
      ref: 'Post.pollResults',
      label: '相關文章',
      many: false,
    }),
    result: integer({
      label: '投票結果',
      validation: { isRequired: true },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['member', 'result', 'post'],
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

export default utils.addTrackingFields(listConfigurations)
