import { list } from '@keystone-6/core'
import { text, relationship, file } from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    name: text({
      label: '檔案名稱',
      validation: { isRequired: true },
    }),
    description: text({
      label: '檔案敘述',
      ui: {
        displayMode: 'textarea',
      },
    }),
    file: file({
      label: '上傳檔案',
      storage: 'files',
    }),
    embedCode: text({
      label: '嵌入碼',
      ui: {
        displayMode: 'textarea',
      },
    }),
    posts: relationship({
      ref: 'Post.attachments',
      many: true,
      label: '相關文章',
    }),
  },
  ui: {
    listView: {
      initialColumns: ['name', 'description', 'posts'],
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
