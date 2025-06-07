import { list } from '@keystone-6/core'
import { text, relationship, integer } from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    category: relationship({
      ref: 'Category',
      label: '對應區塊',
    }),
    posts: relationship({
      ref: 'Post',
      label: '精選文章',
      many: true,
    }),
    topics: relationship({
      ref: 'Topic',
      label: '精選專題',
      many: true,
    }),
    customUrl: text({
      label: '獨立專題網頁',
    }),
    customImage: relationship({
      ref: 'Photo',
      label: '獨立專題圖片',
    }),
    customTitle: text({
      label: '獨立專題標題',
    }),
    customDescription: text({
      label: '獨立專題簡介',
      ui: {
        displayMode: 'textarea',
      },
    }),
    sortOrder: integer({
      label: '排序',
      validation: { isRequired: true },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['category', 'sortOrder'],
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
