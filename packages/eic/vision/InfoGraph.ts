import { list } from '@keystone-6/core'
import {
  text,
  select,
  json,
  timestamp,
  checkbox,
} from '@keystone-6/core/fields'
import { document } from '@keystone-6/fields-document'
import { CustomRelationship } from '../../customFields/CustomRelationship'
import { addTrackingFields } from '../../utils/trackingHandler'
import { RichTextEditor } from '../../customFields/rich-text-editor'
import { allowRoles, admin, moderator, editor } from '../../utils/accessControl'
import draftConverter from '../../customFields/rich-text-editor/draft-to-api-data/draft-converter'

const listConfigurations = list({
  // ui: {
  //     isHidden: true,
  // },
  fields: {
    name: text({
      label: '中文名稱',
      validation: { isRequired: true },
      isIndexed: 'unique',
    }),
    slug: text({ isIndexed: 'unique' }),
    status: select({
      label: '狀態',
      options: [
        { label: '已發布', value: 'published' },
        { label: '草稿', value: 'draft' },
        { label: '已下架', value: 'archived' },
      ],
    }),
    heroImage: CustomRelationship({
      label: '首圖',
      ref: 'Photo',
      ui: {
        hideCreate: true,
      },
      customConfig: {
        isImage: true,
      },
    }),
    publishDate: timestamp({
      validation: {
        isRequired: true,
      },
      label: '發布時間',
    }),
    infograph: text({
      label: '資訊圖表（embedded code）',
    }),
    dataSource: document({
      label: '資料出處',
      links: true,
    }),
    content: RichTextEditor({
      label: '文字說明',
    }),
    dataUpdated: timestamp({
      validation: {
        isRequired: true,
      },
      label: '資料更新時間',
    }),
    relatedPosts: CustomRelationship({
      label: '延伸閱讀',
      ref: 'Post',
      many: true,
      ui: {
        displayMode: 'select',
        hideCreate: true,
        labelField: 'name',
      },
    }),
    apiData: json({
      label: '資料庫使用',
      ui: {
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
      },
    }),
    isHomepage: checkbox({ label: '置於首頁', defaultValue: false }),
  },
  access: {
    operation: {
      query: allowRoles(admin, moderator, editor),
      update: allowRoles(admin, moderator),
      create: allowRoles(admin, moderator),
      delete: allowRoles(admin),
    },
  },
  hooks: {
    resolveInput: ({ resolvedData }) => {
      const { content } = resolvedData
      if (content) {
        resolvedData.apiData = draftConverter.convertToApiData(content).toJS()
      }
      return resolvedData
    },
  },
})

export default addTrackingFields(listConfigurations)
