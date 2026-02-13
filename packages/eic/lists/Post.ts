// @ts-ignore: no definition
import { customFields, utils } from '@mirrormedia/lilith-core'
import { graphql, list } from '@keystone-6/core'
import {
  checkbox,
  multiselect,
  relationship,
  timestamp,
  text,
  select,
  virtual,
  json,
} from '@keystone-6/core/fields'
import envVar from '../environment-variables'
import { aiPollHelperService } from '../services/ai-poll-helper'

const { allowRoles, admin, moderator, editor, contributor } =
  utils.accessControl

type SessionUser = {
  id?: string | number
  role?: string
}

type Session = {
  data?: SessionUser
  itemId?: string | number
}

type FieldMode = 'edit' | 'read' | 'hidden'

type ListItemContext = {
  session?: Session
  context: {
    prisma: {
      Post: {
        findUnique: (args: {
          where: { id: number }
          select: Record<string, unknown>
        }) => Promise<Record<string, unknown> | null>
        update: (args: {
          where: { id: number }
          data: Record<string, unknown>
        }) => Promise<unknown>
      }
    }
    session?: Session
  }
  item: Record<string, unknown>
}

type MaybeItemFunction<T extends FieldMode> =
  | T
  | ((args: ListItemContext) => Promise<T>)

const LOCK_DURATION_MINUTES = 30
const CONTENT_PREVIEW_LENGTH = 100

const extractContentPreview = (
  contentApiData: unknown,
  length: number = CONTENT_PREVIEW_LENGTH
): string | null => {
  if (!Array.isArray(contentApiData)) {
    return null
  }

  const texts: string[] = []

  for (const block of contentApiData) {
    if (!block || typeof block !== 'object') {
      continue
    }
    const contents = (block as { content?: unknown }).content
    if (!Array.isArray(contents)) {
      continue
    }
    for (const c of contents) {
      if (typeof c === 'string') {
        texts.push(c)
      }
    }
    if (texts.join('').length >= length) {
      break
    }
  }

  if (texts.length === 0) {
    return null
  }

  const fullText = texts.join('').replace(/<[^>]+>/g, '')
  if (fullText.length <= length) {
    return fullText
  }
  return fullText.slice(0, length)
}

// 在 CMS 模式下，限制 contributor 只能看到 / 編輯自己建立的文章
const filterPostsForAccess = ({ session }: { session?: Session }) => {
  if (envVar.accessControlStrategy !== 'cms') {
    return true
  }

  const role = session?.data?.role
  const userId = session?.itemId

  if (!role) {
    return false
  }

  if (role === 'contributor') {
    if (!userId) return false
    return {
      createdBy: { id: { equals: userId } },
    }
  }

  return true
}

const itemViewFunction: MaybeItemFunction<FieldMode> = async ({
  session,
  context,
  item,
}) => {
  const role = session?.data?.role

  // 編輯者需要鎖定機制；權限更高者可直接編輯
  if (role === 'editor' || role === 'contributor') {
    const userId = Number(context.session?.itemId)

    const now = new Date()
    const post = await context.prisma.Post.findUnique({
      where: { id: Number(item.id) },
      select: {
        lockBy: {
          select: {
            id: true,
          },
        },
        lockExpireAt: true,
      },
    })

    const lockBy = post?.lockBy as { id?: number } | null
    const lockExpireAt = post?.lockExpireAt as string | Date | null | undefined
    const isExpired = !lockExpireAt || new Date(lockExpireAt as string) <= now

    // 無人鎖定或鎖已過期：嘗試取得鎖
    if (!lockBy || isExpired) {
      const newExpireAt = new Date(
        Date.now() + LOCK_DURATION_MINUTES * 60 * 1000
      ).toISOString()

      await context.prisma.Post.update({
        where: { id: Number(item.id) },
        data: {
          lockById: userId,
          lockExpireAt: newExpireAt,
        },
      })

      return 'edit'
    }

    // 已被自己鎖定，允許編輯
    if (lockBy?.id && Number(lockBy.id) === Number(session?.data?.id)) {
      return 'edit'
    }

    // 被他人鎖定且未過期，僅可唯讀
    return 'read'
  }

  // admin / moderator 直接可編輯
  return 'edit'
}

const listConfigurations = list({
  fields: {
    lockBy: relationship({
      ref: 'User',
      label: '誰正在編輯',
      isFilterable: false,
      ui: {
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'read' },
        displayMode: 'cards',
        cardFields: ['name'],
      },
    }),
    lockExpireAt: timestamp({
      isIndexed: true,
      db: {
        isNullable: true,
      },
      ui: {
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
        listView: { fieldMode: 'hidden' },
      },
    }),
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
      access: {
        update: ({ session }) => {
          // contributor 不能修改 state 欄位（不能發佈文章）
          if (session?.data?.role === 'contributor') {
            return false
          }
          return true
        },
      },
      ui: {
        itemView: {
          fieldMode: ({ session }) => {
            // contributor 在編輯頁面看到 state 但是唯讀
            if (session?.data?.role === 'contributor') {
              return 'read'
            }
            return 'edit'
          },
        },
      },
    }),
    publishTime: timestamp({
      label: '發佈時間',
      validation: { isRequired: true },
    }),
    ogImage: relationship({
      ref: 'Photo',
      label: 'og image',
    }),
    reporters: relationship({
      ref: 'Author',
      label: '記者',
      many: true,
    }),
    translators: relationship({
      ref: 'Author',
      label: '編譯',
      many: true,
    }),
    reviewers: relationship({
      ref: 'Author',
      label: '審校',
      many: true,
    }),
    writers: relationship({
      ref: 'Author',
      label: '文',
      many: true,
    }),
    sources: relationship({
      ref: 'Author',
      label: '稿源',
      many: true,
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
    brief: text({
      label: '前言',
      ui: {
        displayMode: 'textarea',
      },
    }),
    briefApiData: json({
      label: '資料庫使用',
      ui: {
        createView: { fieldMode: 'hidden' },
        listView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
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
        itemView: { fieldMode: 'hidden' },
      },
    }),
    contentPreview: text({
      label: '預覽內容',
      db: {
        isNullable: true,
      },
      ui: {
        createView: { fieldMode: 'hidden' },
        listView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
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
    ad: relationship({
      ref: 'Ad',
      label: '廣告',
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
      many: true,
    }),
    preview: virtual({
      field: graphql.field({
        type: graphql.JSON,
        resolve(item: Record<string, unknown>): Record<string, string> {
          return {
            href: `${envVar.previewServer.path}/node/${item?.id}`,
            label: 'Preview',
          }
        },
      }),
      ui: {
        // A module path that is resolved from where `keystone start` is run
        views: './lists/views/link-button',
        createView: {
          fieldMode: 'hidden',
        },
        listView: {
          fieldMode: 'hidden',
        },
      },
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
    itemView: {
      defaultFieldMode: itemViewFunction,
    },
  },
  access: {
    operation: {
      query: allowRoles(admin, moderator, editor, contributor),
      update: allowRoles(admin, moderator, editor, contributor),
      create: allowRoles(admin, moderator, editor, contributor),
      delete: allowRoles(admin),
    },
    filter: {
      query: filterPostsForAccess,
      update: filterPostsForAccess,
    },
  },
  graphql: {
    cacheHint: { maxAge: 1200, scope: 'PUBLIC' },
  },
  hooks: {
    resolveInput: async ({ resolvedData, item }) => {
      const { content } = resolvedData
      if (content) {
        resolvedData.contentApiData = customFields.draftConverter
          .convertToApiData(content)
          .toJS()
        const preview = extractContentPreview(resolvedData.contentApiData)
        resolvedData.contentPreview = preview ?? null
      } else {
        const shouldFillPreview =
          typeof resolvedData.contentPreview === 'undefined' &&
          (item?.contentPreview == null || item?.contentPreview === '')
        if (shouldFillPreview) {
          const sourceApiData =
            resolvedData.contentApiData ?? item?.contentApiData
          const preview = extractContentPreview(sourceApiData)
          resolvedData.contentPreview = preview ?? null
        }
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
      context,
    }) => {
      // 編輯鎖檢查：相同權限的使用者不可覆寫他人鎖；較高權限可略過
      if (operation === 'update' && envVar.accessControlStrategy !== 'gql') {
        const role = context.session?.data?.role
        if (role === 'editor' || role === 'contributor') {
          const now = new Date()
          const post = await context.prisma.Post.findUnique({
            where: { id: Number(item.id) },
            select: {
              lockBy: {
                select: {
                  id: true,
                },
              },
              lockExpireAt: true,
            },
          })

          const lockBy = post?.lockBy as { id?: number } | null
          const lockExpireAt = post?.lockExpireAt as
            | string
            | Date
            | null
            | undefined

          if (
            lockBy?.id &&
            Number(lockBy.id) !== Number(context.session?.data?.id)
          ) {
            const isExpired =
              !lockExpireAt || new Date(lockExpireAt as string) <= now

            if (!isExpired) {
              addValidationError('可能有其他人正在編輯，請重新整理頁面。')
              return
            }
          }
        }
      }

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
