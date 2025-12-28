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
  json,
} from '@keystone-6/core/fields'
import envVar from '../environment-variables'
import { aiPollHelperService } from '../services/ai-poll-helper'

const { allowRoles, admin, moderator, editor, contributor } =
  utils.accessControl

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
    brief: customFields.richTextEditor({
      label: '前言',
      disabledButtons: ['header-one', 'header-six'],
      website: 'readr',
      presetColors: [
        '#FF6544', // 預設紅色
        '#5085EF', // 預設藍色
        '#A0A0A2', // 預設灰色
        '#373740', // 預設黑色
        '#8BC890', // 預設綠色
        '#D1951D', // 預設黃色
        '#B55514', // 預設棕色
      ],
    }),
    briefApiData: json({
      label: '資料庫使用',
      ui: {
        createView: { fieldMode: 'hidden' },
        listView: { fieldMode: 'hidden' },
      },
    }),
    content: customFields.richTextEditor({
      label: '內文',
      disabledButtons: ['header-three', 'header-four'],
      website: 'readr',
      presetColors: [
        '#FF6544', // 預設紅色
        '#5085EF', // 預設藍色
        '#A0A0A2', // 預設灰色
        '#373740', // 預設黑色
        '#8BC890', // 預設綠色
        '#D1951D', // 預設黃色
        '#B55514', // 預設棕色
      ],
    }),
    contentApiData: json({
      label: '資料庫使用',
      ui: {
        createView: { fieldMode: 'hidden' },
        listView: { fieldMode: 'hidden' },
      },
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
        { label: 'Yahoo!自然環境新聞', value: 'yahoo' },
        { label: 'HiNet政治新聞', value: 'hinet_politics' },
        { label: 'HiNet國際新聞', value: 'hinet_international' },
        { label: 'LineToday國際國內新聞', value: 'line' },
        { label: 'Mesh', value: 'mesh' },
        { label: 'twitter X串接', value: 'twitter' },
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
    isNewsletter: checkbox({
      label: '是否為電子報',
      defaultValue: false,
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
  hooks: {
    resolveInput: async ({ resolvedData, item }) => {
      const { content, brief } = resolvedData
      if (content) {
        resolvedData.contentApiData = customFields.draftConverter
          .convertToApiData(content)
          .toJS()
      }
      if (brief) {
        resolvedData.briefApiData = customFields.draftConverter
          .convertToApiData(brief)
          .toJS()
      }

      // AI 投票小幫手處理
      if (resolvedData.aiPollHelper) {
        try {
          const content = resolvedData.content || item?.content

          if (!content) {
            throw new Error('文章內容為空')
          }

          const aiResult = await aiPollHelperService.generatePollSuggestion(
            content
          )
          resolvedData.aiPollHelperResult = aiResult
          resolvedData.aiPollHelper = false
        } catch (error) {
          // 記錄錯誤日誌
          console.error('AI Poll Helper Error:', error)

          // 清空結果欄位和 checkbox
          resolvedData.aiPollHelperResult = ''
          resolvedData.aiPollHelper = false

          // 拋出 GraphQL 錯誤，讓 Keystone 能夠捕獲並顯示給使用者
          if (error instanceof Error) {
            let errorMessage = 'AI 投票小幫手服務暫時無法使用，請稍後再試'

            switch (error.message) {
              case 'API_KEY_NOT_CONFIGURED':
                errorMessage = 'AI 服務未設定 API 金鑰，請聯繫管理員設定'
                break
              case 'CLIENT_ERROR':
                errorMessage = 'AI 服務請求錯誤，請檢查 API 金鑰設定或稍後再試'
                break
              case 'SERVER_ERROR':
                errorMessage = 'AI 服務暫時無法使用，請稍後再試'
                break
              case '文章內容為空':
                errorMessage = '文章內容為空，無法生成投票建議'
                break
              default:
                errorMessage = 'AI 服務發生未知錯誤，請稍後再試'
            }

            // 拋出 GraphQL 錯誤
            throw new Error(`AI_POLL_HELPER_ERROR: ${errorMessage}`)
          }
        }
      }
      return resolvedData
    },
    validateInput: async ({
      operation,
      item,
      resolvedData,
      addValidationError,
    }) => {
      // publishTime is must while state is not `draft`
      if (operation == 'create') {
        const { state } = resolvedData
        if (state && state != 'draft') {
          const { publishTime } = resolvedData
          if (!publishTime) {
            addValidationError('需要填入發布時間')
          }
        }
      }
      if (operation == 'update') {
        const newState = resolvedData.state || item.state
        const newPublishTime = resolvedData.publishTime || item.publishTime
        if (newState && newState != 'draft') {
          if (!newPublishTime) {
            addValidationError('需要填入發布時間')
          }
        }
      }

      if (resolvedData.aiPollHelper) {
        const content = resolvedData.content || item?.content
        if (!content) {
          addValidationError('啟用 AI 投票小幫手時，內文欄位不能為空')
        }
      }
    },
  },
})

let extendedListConfigurations = utils.addTrackingFields(listConfigurations)

if (
  typeof envVar.invalidateCDNCacheServerURL === 'string' &&
  envVar.invalidateCDNCacheServerURL.trim() !== ''
) {
  extendedListConfigurations = utils.invalidateCacheAfterOperation(
    extendedListConfigurations,
    `${envVar.invalidateCDNCacheServerURL}/post`,
    (item, originalItem) => ({
      slug: originalItem?.id ?? item?.id,
    })
  )
}

export default extendedListConfigurations
