import { list } from '@keystone-6/core'
import { text, relationship, select, timestamp } from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    title: text({
      label: '事件標題',
      validation: { isRequired: true },
    }),
    eventTime: timestamp({
      label: '事件時間',
      validation: { isRequired: true },
    }),
    timeFormat: select({
      label: '前端時間字串',
      type: 'string',
      options: [
        { label: '年', value: 'year' },
        { label: '月', value: 'month' },
        { label: '日', value: 'day' },
      ],
      defaultValue: 'day',
      validation: { isRequired: true },
    }),
    content: text({
      label: '內文',
      ui: {
        displayMode: 'textarea',
      },
    }),
    image: relationship({
      ref: 'Photo',
      label: '圖片',
    }),
    imageCaption: text({
      label: '圖說',
      ui: {
        displayMode: 'textarea',
      },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['title', 'eventTime', 'timeFormat'],
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
    cacheHint: { maxAge: 1200, scope: 'PUBLIC' }
  },
})

export default utils.addTrackingFields(listConfigurations) 
