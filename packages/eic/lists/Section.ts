import { list } from '@keystone-6/core'
import { text, relationship, integer, checkbox, select } from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    slug: text({
      label: 'slug',
      validation: {
        isRequired: true,
        match: {
          regex: /^[a-zA-Z0-9]+$/,
          explanation: 'slug 限輸入英文或數字',
        },
      },
    }),
    name: text({
      label: '名稱',
      validation: { isRequired: true },
    }),
    style: select({
      label: '列表頁樣式',
      defaultValue: 'default',
      options: [
        { label: '一般文章列表頁', value: 'default' },
        { label: '專欄列表頁', value: 'column' },
      ],
    }),
    showInHeader: checkbox({
      label: '顯示於Header',
      defaultValue: false,
    }),
    sortOrder: integer({
      label: '排序',
    }),
    categories: relationship({
      ref: 'Category.section',
      many: true,
      label: '包含的中分類',
    }),
    posts: relationship({
      ref: 'Post.section',
      many: true,
      label: '相關文章',
    }),
  },
  ui: {
    listView: {
      initialColumns: ['name', 'slug', 'style', 'showInHeader', 'sortOrder'],
      initialSort: {
        field: 'sortOrder',
        direction: 'ASC',
      },
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
    cacheHint: { maxAge: 1200, scope: 'PUBLIC' }
  },
})

export default utils.addTrackingFields(listConfigurations) 
