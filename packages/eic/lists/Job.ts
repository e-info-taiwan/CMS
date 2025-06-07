import { list } from '@keystone-6/core'
import {
  text,
  timestamp,
  checkbox,
  integer,
  select,
} from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    title: text({
      label: '職位名稱',
      validation: { isRequired: true },
    }),
    company: text({
      label: '招募單位',
      validation: { isRequired: true },
    }),
    jobDescription: text({
      label: '工作內容',
      ui: {
        displayMode: 'textarea',
      },
      validation: { isRequired: true },
    }),
    requirements: text({
      label: '需求與條件',
      ui: {
        displayMode: 'textarea',
      },
      validation: { isRequired: true },
    }),
    salary: text({
      label: '薪資待遇',
      validation: { isRequired: true },
    }),
    bonus: text({
      label: '加分條件',
      ui: {
        displayMode: 'textarea',
      },
    }),
    applicationMethod: text({
      label: '應徵方式',
      ui: {
        displayMode: 'textarea',
      },
      validation: { isRequired: true },
    }),
    startDate: timestamp({
      label: '徵才開始日期',
      validation: { isRequired: true },
    }),
    endDate: timestamp({
      label: '徵才截止日期',
      validation: { isRequired: true },
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
        'title',
        'company',
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
