import { list } from '@keystone-6/core'
import { integer, checkbox } from '@keystone-6/core/fields'
import { CustomRelationship } from '../../customFields/CustomRelationship'
import { addTrackingFields } from '../../utils/trackingHandler'

const listConfigurations = list({
  // ui: {
  //     isHidden: true,
  // },
  fields: {
    post: CustomRelationship({
      ref: 'Post',
      ui: {
        hideCreate: true,
        displayMode: 'select',
        labelField: 'name',
        displayMode: 'select',
        cardFields: ['name', 'slug'],
        labelField: 'slug',
        linkToItem: true,
        inlineConnect: true,
      },
      many: false,
    }),
    weight: integer({ label: '權重', defaultValue: 2 }),
    active: checkbox({ label: '啟用', defaultValue: true }),
  },
  hooks: {
    validateInput: async ({ operation, inputData, addValidationError }) => {
      if (operation == 'create') {
        if (inputData['post']['disconnect'] == true) {
          addValidationError('需要輸入 post 相關欄位')
        }
      }
      if (operation == 'update') {
        if (
          'disconnect' in inputData['post'] &&
          inputData['post']['disconnect'] == true
        ) {
          addValidationError('需要輸入 post 相關欄位')
        }
      }
    },
  },
})

export default addTrackingFields(listConfigurations)
