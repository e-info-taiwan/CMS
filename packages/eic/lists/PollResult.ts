import { list } from '@keystone-6/core'
import { text, relationship } from '@keystone-6/core/fields'
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
    name: text({ label: '選項', validation: { isRequired: true }, isIndexed: 'unique' }),
    poll: relationship({ 
	  ref: 'Poll.result', 
	  ui: {
		hideCreate: true,
	  },
	  many: false
	}),
    option: relationship({ 
	  ref: 'PollOption.result', 
	  ui: {
		hideCreate: true,
	  },
	  many: false
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
})

export default addTrackingFields(listConfigurations)
