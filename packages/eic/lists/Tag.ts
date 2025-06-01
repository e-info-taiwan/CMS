// @ts-ignore: no definition
import { utils } from '@mirrormedia/lilith-core'
import { list } from '@keystone-6/core'
import { relationship, checkbox, integer, text } from '@keystone-6/core/fields'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    name: text({
      isIndexed: 'unique',
      label: '標籤名稱',
      validation: { isRequired: true },
    }),
    brief: text({
      label: '標籤內容',
    }),
    heroImage: relationship({
      ref: 'Photo',
      label: '標題頁首圖',
    }),
    isFeatured: checkbox({
      label: '是否顯示在首頁',
    }),
    sortOrder: integer({
      label: '排序',
    }),
    posts: relationship({
      ref: 'Post.tags',
      many: true,
      label: '相關文章',
    }),
    topics: relationship({
      ref: 'Topic.tags',
      many: true,
      label: '相關專題',
    }),
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
