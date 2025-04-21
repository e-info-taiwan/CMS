import { list } from '@keystone-6/core'
import { integer, relationship, checkbox } from '@keystone-6/core/fields'
import { addTrackingFields } from '../../utils/trackingHandler'
import { allowRoles, admin, moderator, editor } from '../../utils/accessControl'

const listConfigurations = list({
  // ui: {
  //     isHidden: true,
  // },
  fields: {
    post: relationship({
      ref: 'Post',
      ui: {
        displayMode: 'select',
        hideCreate: true,
        cardFields: ['name'],
        inlineEdit: { fields: ['name'] },
        linkToItem: true,
        inlineConnect: true,
        inlineCreate: { fields: ['name'] },
      },
      many: false,
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
