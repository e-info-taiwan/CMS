import { list } from '@keystone-6/core'
import {
  text,
  relationship,
  checkbox,
  timestamp,
} from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    title: text({
      label: '電子報標題',
      validation: { isRequired: true },
    }),
    heroImage: relationship({
      ref: 'Photo',
      label: '首圖',
    }),
    sendDate: timestamp({
      label: '發送日期',
      validation: { isRequired: true },
    }),
    showMenu: checkbox({
      label: '顯示相關文章標題與超連結',
      defaultValue: false,
    }),
    showReadingRank: checkbox({
      label: '顯示閱讀排名',
      defaultValue: false,
    }),
    focusPosts: relationship({
      ref: 'Post',
      many: true,
      label: '焦點話題',
    }),
    relatedPosts: relationship({
      ref: 'Post',
      many: true,
      label: '相關文章',
    }),
    ads: relationship({
      ref: 'Ad',
      many: true,
      label: '廣告',
    }),
    events: relationship({
      ref: 'Event',
      many: true,
      label: '相關活動',
    }),
    poll: relationship({
      ref: 'Poll',
      label: '閱讀心情',
    }),
    readerResponseTitle: text({
      label: '讀者回應標題',
    }),
    readerResponseLink: text({
      label: '推薦讀者回應連結',
    }),
    originalUrl: text({
      label: '原始網址',
    }),
    readerResponseText: text({
      label: '推薦讀者回應文字',
      ui: {
        displayMode: 'textarea',
      },
    }),
    standardHtml: text({
      label: '原始碼標準版',
      ui: {
        displayMode: 'textarea',
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'read' },
      },
    }),
    beautifiedHtml: text({
      label: '原始碼美化版',
      ui: {
        displayMode: 'textarea',
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'read' },
      },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['title', 'sendDate', 'showMenu', 'showReadingRank'],
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
