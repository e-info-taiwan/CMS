import { list } from '@keystone-6/core'
import { text, timestamp, integer } from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    startDate: timestamp({
      label: '統計開始日期',
      validation: { isRequired: true },
    }),
    endDate: timestamp({
      label: '統計結束日期',
      validation: { isRequired: true },
    }),
    clickFrom: text({
      label: '連結所在頁面位置',
    }),
    clickCount: integer({
      label: '點擊次數',
      validation: { isRequired: true },
      defaultValue: 0,
    }),
  },
  ui: {
    listView: {
      initialColumns: ['startDate', 'endDate', 'clickFrom', 'clickCount'],
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
