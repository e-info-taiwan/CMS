import { list } from '@keystone-6/core'
import { text, relationship, integer } from '@keystone-6/core/fields'
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
    sortOrder: integer({
      label: '排序',
      defaultValue: 1,
    }),
    posts: relationship({
      ref: 'Post.classify',
      many: true,
      label: '相關文章',
    }),
    category: relationship({
      ref: 'Category.classifies',
      many: false,
      label: '所屬中分類',
    }),
  },
  ui: {
    listView: {
      initialColumns: ['name', 'slug', 'sortOrder', 'category'],
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
})

export default utils.addTrackingFields(listConfigurations)
