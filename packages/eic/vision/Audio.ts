import { list } from '@keystone-6/core'
import { text } from '@keystone-6/core/fields'

import {
  allowRoles,
  admin,
  moderator,
  editor,
  owner,
} from '../../utils/accessControl'
import { addTrackingFields } from '../../utils/trackingHandler'

// import { file } from '@keystone-6/core/fields'
import { CustomFile, CustomRelationship } from '../../customFields'
import { GcsFileAdapter } from '../../customFields/CustomFile/GcsFileAdapter'

const gcsFileAdapter = new GcsFileAdapter('video')

const listConfigurations = list({
  fields: {
    name: text({
      label: '標題',
      validation: { isRequired: true },
    }),
    file: CustomFile({
      label: '檔案',
      customConfig: {
        fileType: 'video',
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
      label: '長度（秒）',
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

  hooks: {
    resolveInput: async ({ operation, inputData, item, resolvedData }) => {
      gcsFileAdapter.startFileProcessingFlow(resolvedData, item, inputData)

      return resolvedData
    },
    beforeOperation: async ({ operation, item }) => {
      if (operation === 'delete' && item.file_filename) {
        gcsFileAdapter.startDeleteProcess(`${item.file_filename}`)
      }
    },
  },
})

export default addTrackingFields(listConfigurations)
