import { list } from '@keystone-6/core'
import { text, select, timestamp } from '@keystone-6/core/fields'
import { CustomRelationship } from '../../customFields/CustomRelationship'
import { addTrackingFields } from '../../utils/trackingHandler'
import { allowRoles, admin, moderator, editor } from '../../utils/accessControl'

const listConfigurations = list({
  // ui: {
  //     isHidden: true,
  // },
  fields: {
    mobileImage: CustomRelationship({
      label: '手機用圖片',
      ref: 'Photo',
      customConfig: {
        isImage: true,
      },
      many: false,
      ui: {
        displayMode: 'cards',
        cardFields: ['name', 'imageFile'],
        inlineCreate: {
          fields: ['name', 'imageFile'],
        },
        inlineConnect: true,
      },
    }),
    tabletImage: CustomRelationship({
      label: '平板用圖片',
      ref: 'Photo',
      customConfig: {
        isImage: true,
      },
      many: false,
      ui: {
        displayMode: 'cards',
        cardFields: ['name', 'imageFile'],
        inlineCreate: {
          fields: ['name', 'imageFile'],
        },
        inlineConnect: true,
      },
    }),
    desktopImage: CustomRelationship({
      label: '桌機用圖片',
      ref: 'Photo',
      customConfig: {
        isImage: true,
      },
      many: false,
      ui: {
        displayMode: 'cards',
        cardFields: ['name', 'imageFile'],
        inlineCreate: {
          fields: ['name', 'imageFile'],
        },
        inlineConnect: true,
      },
    }),
    url: text({
      label: '網址',
      validation: {
        isRequired: true,
      },
    }),
    page: select({
      label: '所屬頁面',
      type: 'string',
      options: [
        {
          label: '首頁',
          value: 'home',
        },
        {
          label: '文章頁',
          value: 'article',
        },
      ],
      validation: { isRequired: true },
    }),
    register_start: timestamp({
      label: '開始時間',
      validation: {
        isRequired: true,
      },
    }),
    register_end: timestamp({
      label: '結束時間',
      validation: {
        isRequired: true,
      },
    }),
  },
  hooks: {
    validateInput: async ({ operation, inputData, addValidationError }) => {
      if (operation == 'create') {
        if (
          !('mobileImage' in inputData) ||
          !('tabletImage' in inputData) ||
          !('desktopImage' in inputData)
        ) {
          addValidationError('圖片不能空白')
        }
      }
      if (operation == 'update') {
        if (
          'mobileImage' in inputData &&
          'disconnect' in inputData['mobileImage'] &&
          inputData['mobileImage']['disconnect'] == true
        ) {
          addValidationError('圖片不能空白')
        }
        if (
          'tabletImage' in inputData &&
          'disconnect' in inputData['tabletImage'] &&
          inputData['tabletImage']['disconnect'] == true
        ) {
          addValidationError('圖片不能空白')
        }
        if (
          'desktopImage' in inputData &&
          'disconnect' in inputData['desktopImage'] &&
          inputData['desktopImage']['disconnect'] == true
        ) {
          addValidationError('圖片不能空白')
        }
      }
    },
  },
  access: {
    operation: {
      query: allowRoles(admin, moderator, editor),
      update: allowRoles(admin, moderator),
      create: allowRoles(admin, moderator),
      delete: allowRoles(admin),
    },
  },
})

export default addTrackingFields(listConfigurations)
