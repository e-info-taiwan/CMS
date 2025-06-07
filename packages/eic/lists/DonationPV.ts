import { list, graphql } from '@keystone-6/core'
import { text, timestamp, virtual } from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    pageUrl: text({
      label: '頁面網址',
      validation: { isRequired: true },
    }),
    clickTime: timestamp({
      label: '點擊日期',
      validation: { isRequired: true },
    }),
    // TODO: Check the format of clickTimeString
    clickTimeString: virtual({
      field: graphql.field({
        type: graphql.String,
        resolve: () => {
          return ''
        },
      }),
      label: '點擊日期的字串格式',
      ui: {
        createView: { fieldMode: 'hidden' },
      },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['pageUrl', 'clickTime', 'clickTimeString'],
      pageSize: 50,
    },
  },
  access: {
    operation: {
      query: allowRoles(admin, moderator, editor),
      update: allowRoles(admin),
      create: allowRoles(admin),
      delete: allowRoles(admin),
    },
  },
  graphql: {
    cacheHint: { maxAge: 1200, scope: 'PUBLIC' },
  },
})

export default utils.addTrackingFields(listConfigurations)
