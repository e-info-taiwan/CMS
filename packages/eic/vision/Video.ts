import { list } from '@keystone-6/core'
import { file, text, virtual } from '@keystone-6/core/fields'

import { allowRoles, admin, moderator } from '../../utils/accessControl'
import { addTrackingFields } from '../../utils/trackingHandler'

// import { file } from '@keystone-6/core/fields'
import { CustomRelationship } from '../../customFields'
import { graphql } from '@graphql-ts/schema'
import { googleCloudStorage } from '../../configs/config'

const listConfigurations = list({
  fields: {
    name: text({
      label: '標題',
      validation: { isRequired: true },
    }),
    youtubeUrl: text({
      label: 'Youtube網址',
    }),
    videoFile: file(),
    videoSrc: virtual({
      field: graphql.field({
        type: graphql.String,
        resolve(item: Record<string, unknown>) {
          const filename = item?.videoFile_filename
          if (!filename) {
            return ''
          }
          return `${googleCloudStorage.origin}/${googleCloudStorage.bucket}/files/${filename}`
        },
      }),
    }),
    coverPhoto: CustomRelationship({
      label: '首圖',
      ref: 'Photo',
      ui: {
        hideCreate: true,
      },
      customConfig: {
        isImage: true,
      },
    }),
    description: text({
      label: '描述',
      ui: {
        displayMode: 'textarea',
      },
    }),
    // todo
    tags: text({
      label: '標籤',
      ui: {
        createView: {
          fieldMode: 'hidden',
        },
        itemView: {
          fieldMode: 'read',
        },
      },
    }),
    meta: text({
      label: '中繼資料',
      ui: {
        createView: {
          fieldMode: 'hidden',
        },
        itemView: {
          fieldMode: 'read',
        },
      },
    }),
    url: text({
      label: '檔案網址',
      ui: {
        createView: {
          fieldMode: 'hidden',
        },
        itemView: {
          fieldMode: 'read',
        },
      },
    }),
    duration: text({
      label: '影片長度（秒）',
      ui: {
        createView: {
          fieldMode: 'hidden',
        },
        itemView: {
          fieldMode: 'read',
        },
      },
    }),
  },

  access: {
    operation: {
      query: () => true,
      update: allowRoles(admin, moderator),
      create: allowRoles(admin, moderator),
      delete: allowRoles(admin),
    },
  },
})

export default addTrackingFields(listConfigurations)
