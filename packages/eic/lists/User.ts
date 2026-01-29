import { list } from '@keystone-6/core'
// @ts-ignore: no definition
import { utils } from '@mirrormedia/lilith-core'
import { text, password, select } from '@keystone-6/core/fields'

const { allowRolesForUsers, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    name: text({
      label: '姓名',
      validation: { isRequired: true },
    }),
    email: text({
      label: 'Email',
      validation: { isRequired: true },
      isIndexed: 'unique',
    }),
    password: password({
      label: '密碼',
      validation: { isRequired: true },
    }),
    role: select({
      label: '角色權限',
      type: 'string',
      options: [
        {
          label: 'Admin',
          value: 'admin',
        },
        {
          label: 'Pro editor 主編',
          value: 'moderator',
        },
        {
          label: 'Editor 一般主編',
          value: 'editor',
        },
        {
          label: 'Volunteer 志工',
          value: 'contributor',
        },
      ],
      validation: { isRequired: true },
    }),
  },

  ui: {
    listView: {
      initialColumns: ['name', 'email', 'role'],
      pageSize: 50,
    },
  },
  access: {
    operation: {
      query: allowRolesForUsers(admin, moderator, editor),
      update: allowRolesForUsers(admin, moderator),
      create: allowRolesForUsers(admin, moderator),
      delete: allowRolesForUsers(admin),
    },
  },
  graphql: {
    cacheHint: { maxAge: 1200, scope: 'PUBLIC' },
  },
  hooks: {},
})

export default utils.addTrackingFields(listConfigurations)
