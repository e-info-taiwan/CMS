// @ts-ignore: no definition
import { customFields, utils } from '@mirrormedia/lilith-core'
// @ts-ignore: no definition
import { buttonNames } from '@mirrormedia/lilith-draft-editor/lib/website/readr/draft-editor'
import { graphql, list } from '@keystone-6/core'
import type { KeystoneContext } from '@keystone-6/core/types'
import { Prisma } from '@prisma/client'
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

const CITATIONS_ENABLED_BUTTONS = ['unordered-list-item', 'link']
const BRIEF_ENABLED_BUTTONS = ['bold', 'italic', 'link', 'font-color']
const allReadrButtons: string[] = Object.values(buttonNames)
import {
  invalidateByRoutes,
  invalidatePostCdnCache,
  type RoutePrefixConfig,
} from '../services/invalidate-cdn-cache'

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
const CONTENT_PREVIEW_LENGTH = 400

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

/** 文章狀態，與 list 的 state 選項一致 */
const PostState = {
  Published: 'published',
  Draft: 'draft',
  Scheduled: 'scheduled',
  Archived: 'archived',
  Invisible: 'invisible',
} as const

const ALLOWED_ROLES = ['admin', 'moderator', 'editor', 'contributor'] as const

type CategoryRelateInput = {
  connect?: { id: string | number } | { id: string | number }[]
  disconnect?: { id: string | number } | { id: string | number }[]
  set?: { id: string | number }[]
}

const idsFromRelateConnect = (
  connect: CategoryRelateInput['connect']
): number[] => {
  if (!connect) return []
  const list = Array.isArray(connect) ? connect : [connect]
  return list
    .map((x) => Number(x.id))
    .filter((id) => Number.isFinite(id) && !Number.isNaN(id))
}

const computeFinalCategoryIds = async ({
  operation,
  item,
  resolvedData,
  context,
}: {
  operation: string
  item: Record<string, unknown> | undefined
  resolvedData: Record<string, unknown>
  context: KeystoneContext
}): Promise<number[]> => {
  const raw = resolvedData.categories as CategoryRelateInput | undefined

  // 僅在 GraphQL 真的傳了 set 陣列時才整組取代；避免 { set: undefined } 誤判成清空並跳過後續合併
  if (raw && Array.isArray(raw.set)) {
    return raw.set
      .map((x) => Number(x.id))
      .filter((id) => Number.isFinite(id) && !Number.isNaN(id))
  }

  let current: number[] = []
  if (operation === 'update' && item?.id != null) {
    const row = await context.prisma.Post.findUnique({
      where: { id: Number(item.id) },
      select: { categories: { select: { id: true } } },
    })
    current = (row?.categories ?? []).map((c: { id: number }) => c.id)
  }

  if (!raw) return current

  const next = new Set(current)
  if (raw.disconnect) {
    for (const id of idsFromRelateConnect(raw.disconnect)) {
      next.delete(id)
    }
  }
  if (raw.connect) {
    for (const id of idsFromRelateConnect(raw.connect)) {
      next.add(id)
    }
  }
  return [...next]
}

/**
 * 依 accessControlStrategy 與角色過濾文章。
 * - gql: 僅暴露 published、invisible
 * - preview: 暴露全部
 * - restricted: 暴露全部，list operation restrictions 由 allowRoles 控制
 * - cms: 依角色；admin/moderator 全部，editor 在 mutation/單筆查詢時全部否則僅自己建立，contributor 僅自己建立
 */
const filterPostsForAccess = ({
  session,
  context,
}: {
  session?: Session
  context: KeystoneContext
}) => {
  switch (envVar.accessControlStrategy) {
    case 'gql': {
      return {
        state: {
          in: [PostState.Published, PostState.Invisible],
        },
      }
    }
    case 'preview': {
      return true
    }
    case 'restricted': {
      return true
    }
    case 'cms':
    default: {
      const role = session?.data?.role
      const userId = session?.itemId ?? session?.data?.id

      if (
        role === undefined ||
        !(ALLOWED_ROLES as readonly string[]).includes(role)
      ) {
        return false
      }

      if (role === 'admin' || role === 'moderator') {
        return true
      }

      if (role === 'editor') {
        const reqBody = (
          context.req as { body?: { query?: string; variables?: unknown } }
        )?.body
        const query = reqBody?.query

        if (query && typeof query === 'string') {
          // Mutations: 允許所有文章（用於關聯）
          if (query.trim().startsWith('mutation')) {
            return true
          }
          // 單筆查詢（編輯頁）: 允許所有文章（用於關聯載入）
          const isSingleItemQuery =
            /\bpost\s*\(/.test(query) && !/\bposts\s*\(/.test(query)
          if (isSingleItemQuery) {
            return true
          }
        }

        if (!userId) return false
        return {
          createdBy: { id: { equals: userId } },
        }
      }

      // contributor: 僅自己建立的文章
      if (role === 'contributor') {
        if (!userId) return false
        return {
          createdBy: { id: { equals: userId } },
        }
      }

      return false
    }
  }
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
      ui: {
        views: './lists/views/sorted-relationship',
      },
    }),
    translators: relationship({
      ref: 'Author',
      label: '編譯',
      many: true,
      ui: {
        views: './lists/views/sorted-relationship',
      },
    }),
    reviewers: relationship({
      ref: 'Author',
      label: '審校',
      many: true,
      ui: {
        views: './lists/views/sorted-relationship',
      },
    }),
    writers: relationship({
      ref: 'Author',
      label: '文',
      many: true,
      ui: {
        views: './lists/views/sorted-relationship',
      },
    }),
    sources: relationship({
      ref: 'Author',
      label: '稿源',
      many: true,
      ui: {
        views: './lists/views/sorted-relationship',
      },
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
      ui: {
        views: './lists/views/post/sections',
      },
    }),
    categories: relationship({
      ref: 'Category.posts',
      label: '中分類',
      many: true,
      ui: {
        views: './lists/views/post/categories',
      },
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
    brief: customFields.richTextEditor({
      label: '前言',
      website: 'readr',
      compact: true,
      disabledButtons: allReadrButtons.filter(
        (b: string) => !BRIEF_ENABLED_BUTTONS.includes(b)
      ),
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
        itemView: { fieldMode: 'hidden' },
      },
    }),
    content: customFields.richTextEditor({
      label: '內文',
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
    citations: customFields.richTextEditor({
      label: '參考資料',
      disabledButtons: allReadrButtons.filter(
        (b: string) => !CITATIONS_ENABLED_BUTTONS.includes(b)
      ),
      website: 'readr',
      compact: true,
    }),
    citationsApiData: json({
      label: '資料庫使用',
      ui: {
        createView: { fieldMode: 'hidden' },
        listView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
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
      ui: {
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
        listView: { fieldMode: 'hidden' },
      },
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
      const { brief, content, citations } = resolvedData
      if (
        Object.prototype.hasOwnProperty.call(resolvedData, 'brief') &&
        brief === null
      ) {
        resolvedData.brief = Prisma.DbNull
      }
      if (
        Object.prototype.hasOwnProperty.call(resolvedData, 'citations') &&
        citations === null
      ) {
        resolvedData.citations = Prisma.DbNull
      }
      if (
        Object.prototype.hasOwnProperty.call(resolvedData, 'content') &&
        content === null
      ) {
        resolvedData.content = Prisma.DbNull
      }
      if (citations) {
        resolvedData.citationsApiData = customFields.draftConverter
          .convertToApiData(citations)
          .toJS()
      }
      if (brief) {
        resolvedData.briefApiData = customFields.draftConverter
          .convertToApiData(brief)
          .toJS()
      }
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

      // 驗證：每一個中分類必須屬於所選大分類（最終 category id 集合）
      const sectionInput = resolvedData.section as
        | {
            connect?: { id?: string | number }
            set?: { id: string | number }[]
            disconnect?: boolean
          }
        | undefined

      let finalSectionId: number | null | undefined
      if (
        sectionInput?.disconnect === true &&
        !sectionInput?.connect &&
        !(sectionInput?.set && sectionInput.set.length > 0)
      ) {
        finalSectionId = null
      } else if (sectionInput?.set && sectionInput.set.length > 0) {
        finalSectionId = Number(sectionInput.set[0].id)
      } else if (
        sectionInput?.connect?.id != null &&
        sectionInput.connect.id !== ''
      ) {
        finalSectionId = Number(sectionInput.connect.id)
      } else if (operation === 'update' && item != null) {
        const sid = (item as { sectionId?: number | null }).sectionId
        finalSectionId = sid != null ? Number(sid) : null
      } else {
        finalSectionId = undefined
      }

      const finalCategoryIds = await computeFinalCategoryIds({
        operation,
        item: item as Record<string, unknown> | undefined,
        resolvedData: resolvedData as Record<string, unknown>,
        context,
      })

      if (finalCategoryIds.length > 0) {
        if (finalSectionId == null) {
          addValidationError('已選擇中分類時，必須先選擇大分類')
        } else {
          for (const categoryId of finalCategoryIds) {
            const category = await context.prisma.Category.findUnique({
              where: { id: categoryId },
              select: { sectionId: true },
            })
            if (
              !category ||
              category.sectionId === null ||
              Number(category.sectionId) !== Number(finalSectionId)
            ) {
              addValidationError('中分類必須屬於所選的大分類')
              break
            }
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

const postListWithManualOrder = utils.addManualOrderRelationshipFields(
  [
    {
      fieldName: 'manualOrderOfReporters',
      fieldLabel: '記者（按新增順序）',
      targetFieldName: 'reporters',
      targetListName: 'Author',
      targetListLabelField: 'name',
    },
    {
      fieldName: 'manualOrderOfTranslators',
      fieldLabel: '編譯（按新增順序）',
      targetFieldName: 'translators',
      targetListName: 'Author',
      targetListLabelField: 'name',
    },
    {
      fieldName: 'manualOrderOfReviewers',
      fieldLabel: '審校（按新增順序）',
      targetFieldName: 'reviewers',
      targetListName: 'Author',
      targetListLabelField: 'name',
    },
    {
      fieldName: 'manualOrderOfWriters',
      fieldLabel: '文（按新增順序）',
      targetFieldName: 'writers',
      targetListName: 'Author',
      targetListLabelField: 'name',
    },
    {
      fieldName: 'manualOrderOfSources',
      fieldLabel: '稿源（按新增順序）',
      targetFieldName: 'sources',
      targetListName: 'Author',
      targetListLabelField: 'name',
    },
  ],
  listConfigurations,
  {
    parentListKey: 'Post',
    manualOrderJsonViews: './lists/views/manual-order-json-read',
  }
)

let extendedListConfigurations = utils.addTrackingFields(
  postListWithManualOrder
)

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
} else if (
  envVar.invalidateCDNCache.projectId &&
  envVar.invalidateCDNCache.urlMapName &&
  envVar.invalidateCDNCache.routePrefixConfig?.post
) {
  const originalAfterOperation =
    extendedListConfigurations.hooks?.afterOperation

  extendedListConfigurations.hooks = {
    ...extendedListConfigurations.hooks,
    afterOperation: async ({ item, originalItem }) => {
      const itemId = (originalItem?.id ?? item?.id) as
        | string
        | number
        | undefined
      const topicId = (originalItem?.topicId ?? item?.topicId) as
        | string
        | number
        | undefined

      const tasks: Promise<unknown>[] = [
        invalidatePostCdnCache(
          {
            projectId: envVar.invalidateCDNCache.projectId,
            urlMapName: envVar.invalidateCDNCache.urlMapName,
            routePrefixConfig: envVar.invalidateCDNCache
              .routePrefixConfig as RoutePrefixConfig,
          },
          itemId
        ),
      ]

      if (topicId && envVar.invalidateCDNCache.routePrefixConfig?.topic) {
        tasks.push(
          invalidateByRoutes(
            {
              projectId: envVar.invalidateCDNCache.projectId,
              urlMapName: envVar.invalidateCDNCache.urlMapName,
              routePrefixConfig: envVar.invalidateCDNCache
                .routePrefixConfig as RoutePrefixConfig,
            },
            [envVar.invalidateCDNCache.routePrefixConfig.topic],
            topicId
          )
        )
      }

      await Promise.allSettled([
        originalAfterOperation?.({ item, originalItem } as Parameters<
          NonNullable<typeof originalAfterOperation>
        >[0]),
        ...tasks,
      ])
    },
  }
}

export default extendedListConfigurations
