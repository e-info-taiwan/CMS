import { list } from '@keystone-6/core'
import { integer, text, relationship, checkbox } from '@keystone-6/core/fields'
import { addTrackingFields } from '../../utils/trackingHandler'
import {
  allowRoles,
  admin,
  moderator,
  editor,
  owner,
} from '../../utils/accessControl'

const listConfigurations = list({
  // ui: {
  //     isHidden: true,
  // },
  fields: {
    post: relationship({ 
	  ref: 'Event', 
      ui: {
        displayMode: 'select',
        cardFields: ['name'],
		hideCreate: true,
        inlineEdit: { fields: ['name'] },
        linkToItem: true,
        inlineConnect: true,
        inlineCreate: { fields: ['name'] },
      },
      many: false,
	  many: false, 
	}),
    weight: integer ({ 
	  label: '權重', 
	  defaultValue: 2,
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
    active: checkbox({ label: '啟用', defaultValue: true }),
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
