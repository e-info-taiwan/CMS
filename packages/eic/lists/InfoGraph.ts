import { list } from '@keystone-6/core'
import { text, relationship, select } from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    name: text({
      label: '名稱',
      validation: { isRequired: true },
    }),
    title: text({
      label: '標題',
    }),
    description: text({
      label: '描述',
      ui: {
        displayMode: 'textarea',
      },
    }),
    image: relationship({
      ref: 'Photo',
      label: '圖片',
    }),
    youtubeUrl: text({
      label: 'Youtube 影片',
    }),
    state: select({
      label: '狀態',
      options: [
        { label: '已發布', value: 'published' },
        { label: '預約發佈', value: 'scheduled' },
        { label: '草稿', value: 'draft' },
        { label: '已下線', value: 'archived' },
      ],
      defaultValue: 'draft',
      validation: { isRequired: true },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['name', 'state', 'title'],
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
  graphql: {
    cacheHint: { maxAge: 1200, scope: 'PUBLIC' },
  },
})

export default utils.addTrackingFields(listConfigurations)
