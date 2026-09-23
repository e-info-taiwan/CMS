import { list } from '@keystone-6/core'
import {
  integer,
  relationship,
  select,
  text,
  timestamp,
} from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    post: relationship({
      ref: 'Post',
      label: '文章',
    }),
    kind: select({
      label: '向量類型',
      type: 'string',
      defaultValue: 'document',
      options: [
        { label: '文章文件', value: 'document' },
        { label: '標題', value: 'title' },
        { label: '段落', value: 'chunk' },
      ],
      validation: { isRequired: true },
    }),
    model: text({
      label: 'Embedding model',
      validation: { isRequired: true },
    }),
    dimension: integer({
      label: '向量維度',
      defaultValue: 1536,
      validation: { isRequired: true },
    }),
    sourceHash: text({
      label: '來源雜湊',
      isIndexed: true,
      validation: { isRequired: true },
    }),
    sourcePreview: text({
      label: '來源預覽',
      ui: { displayMode: 'textarea' },
    }),
    embeddingGeneratedAt: timestamp({
      label: '向量更新時間',
      db: { isNullable: true },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['id', 'post', 'kind', 'model', 'embeddingGeneratedAt'],
      initialSort: { field: 'embeddingGeneratedAt', direction: 'DESC' },
      pageSize: 50,
    },
  },
  access: {
    operation: {
      query: allowRoles(admin, moderator, editor),
      update: allowRoles(admin),
      create: allowRoles(admin),
      delete: allowRoles(admin),
    },
  },
})

export default utils.addTrackingFields(listConfigurations)
