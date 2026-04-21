import { list } from '@keystone-6/core'
import type { KeystoneContext } from '@keystone-6/core/types'
import {
  text,
  relationship,
  select,
  checkbox,
  integer,
  timestamp,
} from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'
import envVar from '../environment-variables'
import {
  invalidateByRoutes,
  type RoutePrefixConfig,
} from '../services/invalidate-cdn-cache'

const { allowRoles, admin, moderator, editor } = utils.accessControl

type SessionUser = {
  id?: string | number
  role?: string
}

type Session = {
  data?: SessionUser
  itemId?: string | number
}

/** 活動狀態，與 list 的 state 選項一致 */
const EventState = {
  Published: 'published',
  Scheduled: 'scheduled',
  Draft: 'draft',
  Archive: 'archive',
} as const

const ALLOWED_EVENT_ROLES = ['admin', 'moderator', 'editor'] as const

/**
 * 依 accessControlStrategy 與角色過濾活動，與 Lilith Post filter 邏輯一致。
 * - gql: 僅暴露 published
 * - preview: 暴露全部
 * - restricted: 暴露全部，list operation restrictions 由 allowRoles 控制
 * - cms: admin/moderator 全部，editor 在 mutation/單筆查詢時全部否則僅自己建立
 */
const filterEventsForAccess = ({
  session,
  context,
}: {
  session?: Session
  context: KeystoneContext
}) => {
  switch (envVar.accessControlStrategy) {
    case 'gql': {
      return {
        state: { equals: EventState.Published },
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
        !(ALLOWED_EVENT_ROLES as readonly string[]).includes(role)
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
          if (query.trim().startsWith('mutation')) {
            return true
          }
          const isSingleItemQuery =
            /\bevent\s*\(/.test(query) && !/\bevents\s*\(/.test(query)
          if (isSingleItemQuery) {
            return true
          }
        }

        if (!userId) return false
        return {
          createdBy: { id: { equals: userId } },
        }
      }

      return false
    }
  }
}

const listConfigurations = list({
  fields: {
    name: text({
      label: '活動名稱',
      validation: { isRequired: true },
    }),
    heroImage: relationship({
      ref: 'Photo',
      label: '首圖',
    }),
    organizer: text({
      label: '主辦單位',
    }),
    contactInfo: text({
      label: '聯絡方式',
    }),
    eventType: select({
      label: '活動類型',
      type: 'string',
      options: [
        { label: '課程/營隊/工作坊', value: 'course_camp_workshop' },
        { label: '演講/座談會', value: 'lecture_forum' },
        { label: '研討會', value: 'seminar' },
        { label: '展覽/節目預告', value: 'exhibition_preview' },
        { label: '行動參與', value: 'action_participation' },
        { label: '徵件', value: 'call_for_entries' },
        { label: '其他', value: 'other' },
      ],
      validation: { isRequired: true },
    }),
    city: select({
      label: '縣市',
      type: 'string',
      options: [
        { label: '臺北市', value: '臺北市' },
        { label: '新北市', value: '新北市' },
        { label: '桃園市', value: '桃園市' },
        { label: '臺中市', value: '臺中市' },
        { label: '臺南市', value: '臺南市' },
        { label: '高雄市', value: '高雄市' },
        { label: '基隆市', value: '基隆市' },
        { label: '新竹市', value: '新竹市' },
        { label: '嘉義市', value: '嘉義市' },
        { label: '新竹縣', value: '新竹縣' },
        { label: '苗栗縣', value: '苗栗縣' },
        { label: '彰化縣', value: '彰化縣' },
        { label: '南投縣', value: '南投縣' },
        { label: '雲林縣', value: '雲林縣' },
        { label: '嘉義縣', value: '嘉義縣' },
        { label: '屏東縣', value: '屏東縣' },
        { label: '宜蘭縣', value: '宜蘭縣' },
        { label: '花蓮縣', value: '花蓮縣' },
        { label: '臺東縣', value: '臺東縣' },
        { label: '澎湖縣', value: '澎湖縣' },
        { label: '金門縣', value: '金門縣' },
        { label: '連江縣', value: '連江縣' },
        { label: '其他', value: '其他' },
      ],
      db: { isNullable: true },
    }),
    startDate: timestamp({
      label: '活動開始日期',
      validation: { isRequired: true },
    }),
    endDate: timestamp({
      label: '活動結束日期',
    }),
    location: text({
      label: '活動地點',
      validation: { isRequired: true },
    }),
    fee: text({
      label: '活動費用',
    }),
    registrationUrl: text({
      label: '活動／報名網址',
    }),
    content: text({
      label: '活動內容',
      ui: {
        displayMode: 'textarea',
      },
    }),
    isApproved: checkbox({
      label: '審核通過',
      defaultValue: false,
    }),
    sortOrder: integer({
      label: '排序',
      validation: { isRequired: true },
    }),
    state: select({
      label: '狀態',
      type: 'string',
      options: [
        { label: '已發布', value: 'published' },
        { label: '預約發佈', value: 'scheduled' },
        { label: '草稿', value: 'draft' },
        { label: '已下線', value: 'archive' },
      ],
      validation: { isRequired: true },
      defaultValue: 'draft',
    }),
  },
  ui: {
    listView: {
      initialColumns: ['name', 'organizer', 'state', 'isApproved', 'sortOrder'],
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
    filter: {
      query: filterEventsForAccess,
      update: filterEventsForAccess,
    },
  },
  graphql: {
    cacheHint: { maxAge: 1200, scope: 'PUBLIC' },
  },
})

const extendedListConfigurations = utils.addTrackingFields(listConfigurations)

if (
  envVar.invalidateCDNCache.projectId &&
  envVar.invalidateCDNCache.urlMapName &&
  envVar.invalidateCDNCache.routePrefixConfig?.event
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
      await Promise.allSettled([
        originalAfterOperation?.({ item, originalItem } as Parameters<
          NonNullable<typeof originalAfterOperation>
        >[0]),
        invalidateByRoutes(
          {
            projectId: envVar.invalidateCDNCache.projectId,
            urlMapName: envVar.invalidateCDNCache.urlMapName,
            routePrefixConfig: envVar.invalidateCDNCache
              .routePrefixConfig as RoutePrefixConfig,
          },
          [envVar.invalidateCDNCache.routePrefixConfig?.event],
          itemId
        ),
      ])
    },
  }
}

export default extendedListConfigurations
