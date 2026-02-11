import { list } from '@keystone-6/core'
import {
  text,
  relationship,
  select,
  checkbox,
  integer,
  timestamp,
} from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

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
    showOnHomepage: checkbox({
      label: '是否顯示於首頁',
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
      initialColumns: [
        'name',
        'organizer',
        'state',
        'isApproved',
        'showOnHomepage',
        'sortOrder',
      ],
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
