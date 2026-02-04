import { list } from '@keystone-6/core'
import {
  text,
  relationship,
  select,
  checkbox,
  integer,
} from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    title: text({
      label: '標題',
      validation: { isRequired: true },
    }),
    status: select({
      label: '狀態',
      type: 'string',
      options: [
        { label: '已發布', value: 'published' },
        { label: '草稿', value: 'draft' },
        { label: '已下線', value: 'archived' },
        { label: '前台不可見', value: 'invisible' },
      ],
      defaultValue: 'draft',
      validation: { isRequired: true },
    }),
    content: text({
      label: '專題內容',
      ui: {
        displayMode: 'textarea',
      },
    }),
    authorInfo: text({
      label: '專題作者資訊',
      ui: {
        displayMode: 'textarea',
      },
    }),
    heroImage: relationship({
      ref: 'Photo',
      label: '首圖',
    }),
    posts: relationship({
      ref: 'Post.topic',
      label: '專題關聯的文章',
      many: true,
    }),
    tags: relationship({
      ref: 'Tag.topics',
      label: '標籤',
      many: true,
    }),
    isPinned: checkbox({
      label: '置頂',
      defaultValue: false,
    }),
    sortOrder: integer({
      label: '排序',
      defaultValue: 0,
    }),
  },
  ui: {
    listView: {
      initialColumns: ['title', 'status', 'isPinned', 'sortOrder'],
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
