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
    type: select({
      label: '類型',
      type: 'string',
      options: [
        { label: '超連結按鈕', value: 'link' },
        { label: '捐款圖文', value: 'donation' },
      ],
    }),
    displayLocation: select({
      label: '顯示位置',
      type: 'string',
      options: [
        { label: '首頁 Pop-up', value: 'homepage_popup' },
        { label: '文章末', value: 'article_end' },
      ],
    }),
    title: text({
      label: '標題',
    }),
    content: text({
      label: '內容',
      ui: {
        displayMode: 'textarea',
      },
    }),
    image: relationship({
      ref: 'Photo',
      label: '圖片',
    }),
    link: text({
      label: '連結',
    }),
    state: select({
      label: '狀態',
      type: 'string',
      options: [
        { label: '啟用', value: 'active' },
        { label: '停用', value: 'inactive' },
      ],
      defaultValue: 'active',
    }),
  },
  ui: {
    listView: {
      initialColumns: ['name', 'type', 'state'],
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
