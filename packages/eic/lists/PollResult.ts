import { list } from '@keystone-6/core'
import { relationship, timestamp, text } from '@keystone-6/core/fields'
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
      many: true,
    }),
    post: relationship({
      ref: 'Post.pollResult',
      label: '相關文章',
      many: false,
    }),
    // TODO: Review poll result format
    result: text({
      label: '投票結果',
      validation: { isRequired: true },
    }),
    endTime: timestamp({
      label: '投票截止時間',
      validation: { isRequired: true },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['poll', 'member', 'result', 'endTime'],
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
