// @ts-ignore: no definition
import { customFields, utils } from '@mirrormedia/lilith-core'
import { list } from '@keystone-6/core'
import {
  checkbox,
  multiselect,
  relationship,
  timestamp,
  text,
  select,
} from '@keystone-6/core/fields'
import envVar from '../environment-variables'

const { allowRoles, admin, moderator, editor, contributor } = utils.accessControl

const listConfigurations = list({
  fields: {
    title: text({
      label: '標題',
      validation: { isRequired: true },
    }),
    subtitle: text({
      label: '副標',
      validation: { isRequired: false },
      db: {
        isNullable: true,
      },
    }),
    state: select({
      label: '狀態',
      options: [
        { label: '已發布', value: 'published' },
        { label: '預約發佈', value: 'scheduled' },
        { label: '草稿', value: 'draft' },
        { label: '已下線', value: 'archived' },
        { label: '前台不可見', value: 'invisible' },
      ],
      defaultValue: 'draft',
      isIndexed: true,
    }),
    publishTime: timestamp({
      label: '發佈時間',
      validation: { isRequired: true },
    }),
    ogImage: relationship({
      ref: 'Photo',
      label: 'og image',
    }),
    author1: relationship({
      ref: 'Author',
      label: '作者-角色1',
    }),
    author2: relationship({
      ref: 'Author',
      label: '作者-角色2',
    }),
    author3: relationship({
      ref: 'Author',
      label: '作者-角色3',
    }),
    otherByline: text({
      label: '作者（其他）',
    }),
    locations: relationship({
      ref: 'Location',
      label: '地點',
      many: true,
    }),
    section: relationship({
      ref: 'Section.posts',
      label: '大分類',
    }),
    category: relationship({
      ref: 'Category.posts',
      label: '中分類',
    }),
    classify: relationship({
      ref: 'Classify.posts',
      label: '小分類',
    }),
    topic: relationship({
      ref: 'Topic.posts',
      label: '專題',
    }),
    style: select({
      label: '文章樣式',
      options: [
        { label: '一般文章頁', value: 'default' },
        { label: '編輯直送', value: 'editor' },
      ],
      defaultValue: 'default',
    }),
    heroImage: relationship({
      ref: 'Photo',
      label: '首圖',
    }),
    heroCaption: text({
      label: '首圖圖說',
    }),
    content: customFields.richTextEditor({
      label: '內文',
      disabledButtons: ['header-three', 'header-four'],
      website: 'readr',
    }),
    attachments: relationship({
      ref: 'Attachment.posts',
      label: '附加檔案',
      many: true,
    }),
    citations: text({
      label: '參考資料',
      ui: {
        displayMode: 'textarea',
      },
    }),
    relatedPosts: relationship({
      ref: 'Post',
      label: '相關文章',
      many: true,
    }),
    ad1: relationship({
      ref: 'Ad',
      label: '廣告位置1',
    }),
    ad2: relationship({
      ref: 'Ad',
      label: '廣告位置2',
    }),
    // TODO: Implement tag count limit: <=10
    tags: relationship({
      ref: 'Tag.posts',
      label: '標籤',
      many: true,
    }),
    rssTargets: multiselect({
      label: '送出RSS',
      type: 'string',
      options: [
        { label: 'twitter X串接', value: 'twitter' },
        { label: 'yahoo news', value: 'yahoo' },
        { label: 'Line today', value: 'line' },
        { label: 'Mesh', value: 'mesh' },
        { label: '環境新聞RSS(公版)', value: 'eic' },
      ],
    }),
    poll: relationship({
      ref: 'Poll.posts',
      label: '投票工具',
    }),
    pollResults: relationship({
      ref: 'PollResult.post',
      label: '投票結果',
    }),
    aiPollHelper: checkbox({
      label: 'AI 投票小幫手',
      defaultValue: false,
    }),
    // TODO: Implement AI helper result pipeline
    aiPollHelperResult: text({
      label: 'AI 投票小幫手建議結果',
      ui: {
        displayMode: 'textarea',
      },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['id', 'title', 'state', 'publishTime'],
      initialSort: { field: 'publishTime', direction: 'DESC' },
      pageSize: 50,
    },
  },
  // TODO: contributor can only create draft and cannot edit post's state
  access: {
    operation: {
      query: allowRoles(admin, moderator, editor, contributor),
      update: allowRoles(admin, moderator, editor, contributor),
      create: allowRoles(admin, moderator, editor, contributor),
      delete: allowRoles(admin),
    },
  },
  graphql: {
    cacheHint: { maxAge: 1200, scope: 'PUBLIC' },
  },
  // TODO: Implement hooks
  hooks: {
  },
})

let extendedListConfigurations = utils.addTrackingFields(listConfigurations)

if (typeof envVar.invalidateCDNCacheServerURL === 'string') {
  extendedListConfigurations = utils.invalidateCacheAfterOperation(
    extendedListConfigurations,
    `${envVar.invalidateCDNCacheServerURL}/story`,
    (item, originalItem) => ({
      slug: originalItem?.id ?? item?.id,
    })
  )
}

export default extendedListConfigurations
