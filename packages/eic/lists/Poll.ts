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
    content: text({
      label: '投票內容',
      validation: { isRequired: true },
      ui: {
        displayMode: 'textarea',
      },
    }),
    option1: text({
      label: '投票選項1',
    }),
    option1Image: relationship({
      ref: 'Photo',
      label: '投票選項1圖示',
    }),
    option2: text({
      label: '投票選項2',
    }),
    option2Image: relationship({
      ref: 'Photo',
      label: '投票選項2圖示',
    }),
    option3: text({
      label: '投票選項3',
    }),
    option3Image: relationship({
      ref: 'Photo',
      label: '投票選項3圖示',
    }),
    option4: text({
      label: '投票選項4',
    }),
    option4Image: relationship({
      ref: 'Photo',
      label: '投票選項4圖示',
    }),
    option5: text({
      label: '投票選項5',
    }),
    option5Image: relationship({
      ref: 'Photo',
      label: '投票選項5圖示',
    }),
    posts: relationship({
      ref: 'Post.poll',
      many: true,
      label: '相關文章',
    }),
    newsletters: relationship({
      ref: 'Newsletter.poll',
      many: true,
      label: '相關電子報',
    }),
    status: select({
      label: '狀態',
      type: 'string',
      options: [
        { label: '啟用', value: 'active' },
        { label: '停用', value: 'inactive' },
      ],
      defaultValue: 'active',
      validation: { isRequired: true },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['name', 'content', 'status'],
      pageSize: 50,
    },
  },
  access: {
    operation: {
      query: () => true, // 允許匿名查詢投票內容
      update: allowRoles(admin, moderator, editor),
      create: allowRoles(admin, moderator, editor),
      delete: allowRoles(admin),
    },
  },
})

export default utils.addTrackingFields(listConfigurations)
