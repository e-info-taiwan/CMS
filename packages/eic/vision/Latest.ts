import { list, graphql } from '@keystone-6/core'
import {
  text,
  relationship,
  timestamp,
  select,
  checkbox,
  json,
  virtual,
} from '@keystone-6/core/fields'

import { allowRoles, admin, moderator, editor } from '../../utils/accessControl'
import { addTrackingFields } from '../../utils/trackingHandler'
import { RichTextEditor } from '../../customFields/rich-text-editor'
import draftConverter from '../../customFields/rich-text-editor/draft-to-api-data/draft-converter'

const listConfigurations = list({
  fields: {
    name: text({
      label: '標題（長度限制：15）',
    }),
    slug: text({
      label: 'slug',
    }),
    subtitle: text({
      label: '副標',
    }),
    status: select({
      options: [
        { label: 'Published', value: 'published' },
        { label: 'Draft', value: 'draft' },
      ],
      // We want to make sure new posts start off as a draft when they are created
      defaultValue: 'published',
      // fields also have the ability to configure their appearance in the Admin UI
      ui: {
        displayMode: 'segmented-control',
      },
    }),
    publishTime: timestamp({
      label: '發布時間',
    }),
    type: select({
      options: [
        { label: '靜態頁面', value: 'announcement' },
        { label: '新聞專區', value: 'news' },
      ],
      // We want to make sure new posts start off as a draft when they are created
      defaultValue: 'news',
      // fields also have the ability to configure their appearance in the Admin UI
      ui: {
        displayMode: 'segmented-control',
      },
    }),
    content: RichTextEditor({
      label: '內文',
    }),
    download: relationship({
      ref: 'Download.latest',
      ui: {
        displayMode: 'select',
        hideCreate: true,
        cardFields: ['name'],
        inlineEdit: { fields: ['name'] },
        linkToItem: true,
        inlineConnect: true,
        inlineCreate: { fields: ['name'] },
      },
      many: true,
    }),
    active: checkbox({
      label: '啟用',
      defaultValue: true,
      ui: {
        createView: {
          fieldMode: 'hidden',
        },
        itemView: {
          fieldMode: 'hidden',
        },
        listView: {
          fieldMode: 'hidden',
        },
      },
    }),
    previewButton: virtual({
      field: graphql.field({
        type: graphql.String,
        resolve(item: Record<string, unknown>): string {
          if (item?.type == 'news') {
            return `/news/${item?.id}`
          } else {
            return `/info/${item?.slug}`
          }
        },
      }),
      ui: {
        views: require.resolve('../../customFields/preview-button.tsx'),
      },
    }),
    apiData: json({
      label: '資料庫使用',
      ui: {
        createView: { fieldMode: 'hidden' },
        itemView: { fieldMode: 'hidden' },
      },
    }),
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
