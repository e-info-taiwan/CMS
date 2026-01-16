// @ts-ignore: no definition
import { utils } from '@mirrormedia/lilith-core'
import { list } from '@keystone-6/core'
import { integer, relationship, text } from '@keystone-6/core/fields'

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
    heroImage: relationship({
      ref: 'Photo',
      label: 'Photos 首圖',
    }),
    heroImageCaption: text({
      label: '首圖圖說',
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
    featuredPosts: relationship({
      ref: 'Post',
      many: true,
      label: '精選文章',
      ui: {
        hideCreate: true,
        linkToItem: false,
      },
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
    cacheHint: { maxAge: 1200, scope: 'PUBLIC' },
  },
})

// 使用 addManualOrderRelationshipFields 來記錄 featuredPosts 的新增順序
const listWithManualOrder = utils.addManualOrderRelationshipFields(
  [
    {
      fieldName: 'manualOrderOfFeaturedPosts',
      fieldLabel: '精選文章（按新增順序）',
      targetFieldName: 'featuredPosts',
      targetListName: 'Post',
      targetListLabelField: 'title',
    },
  ],
  listConfigurations
)

export default utils.addTrackingFields(listWithManualOrder)
