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
    donationType: select({
      label: '類型',
      type: 'string',
      options: [
        { label: 'Light box', value: 'lightbox' },
        { label: '文末圖片', value: 'footer' },
      ],
      validation: { isRequired: true },
    }),
    title: text({
      label: '標題',
    }),
    subtitle: text({
      label: '副標',
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
    state: select({
      label: '狀態',
      type: 'string',
      options: [
        { label: '啟用', value: 'active' },
        { label: '停用', value: 'inactive' },
      ],
      validation: { isRequired: true },
      defaultValue: 'inactive',
    }),
    donationUrl: text({
      label: '捐款連結',
      validation: { isRequired: true },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['name', 'donationType', 'state'],
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
