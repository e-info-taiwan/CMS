// @ts-ignore: no definition
import { utils } from '@mirrormedia/lilith-core'
import { list } from '@keystone-6/core'
import { integer, relationship, checkbox, select, text } from '@keystone-6/core/fields'

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
      ref: 'Post.category',
      many: true,
      label: '相關文章',
    }),
    section: relationship({
      ref: 'Section.categories',
      many: false,
      label: '所屬大分類',
    }),
    classifies: relationship({
      ref: 'Classify.category',
      many: true,
      label: '包含的小分類',
    }),
  },
  ui: {
    listView: {
      initialColumns: ['name', 'slug', 'sortOrder', 'section'],
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
