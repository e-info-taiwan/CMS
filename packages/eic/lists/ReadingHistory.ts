import { list } from '@keystone-6/core'
import { relationship } from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    member: relationship({
      ref: 'Member',
      label: '會員',
    }),
    post: relationship({
      ref: 'Post',
      label: '文章',
    }),
  },
  ui: {
    listView: {
      initialColumns: ['member', 'post'],
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
