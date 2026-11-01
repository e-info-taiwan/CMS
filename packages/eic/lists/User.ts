import crypto from 'crypto'
import bcryptjs from 'bcryptjs'
import { list } from '@keystone-6/core'
// @ts-ignore: no definition
import { utils } from '@mirrormedia/lilith-core'
import { text, password, select } from '@keystone-6/core/fields'

const { allowRoles, admin, moderator, editor } = utils.accessControl

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
      hooks: {
        resolveInput: ({ resolvedData }) => {
          if (typeof resolvedData.email === 'string') {
            return resolvedData.email.trim().toLowerCase()
          }
          return resolvedData.email
        },
      },
    }),
    password: password({
      label: '密碼',
      db: { isNullable: false },
      ui: {
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
        listView: { fieldMode: 'hidden' },
      },
      hooks: {
        resolveInput: async ({ operation, resolvedData }) => {
          if (operation === 'create' && !resolvedData.password) {
            return bcryptjs.hash(crypto.randomBytes(32).toString('hex'), 10)
          }
          if (operation === 'update' && resolvedData.password === null) {
            return undefined
          }
          return resolvedData.password
        },
      },
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
      query: allowRoles(admin, moderator, editor),
      update: allowRoles(admin, moderator),
      create: allowRoles(admin, moderator),
      delete: allowRoles(admin),
    },
  },
  graphql: {
    cacheHint: { maxAge: 1200, scope: 'PUBLIC' },
  },
  hooks: {},
})

export default utils.addTrackingFields(listConfigurations)
