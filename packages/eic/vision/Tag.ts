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
    name: text({ label: '中文名稱', validation: { isRequired: true }, isIndexed: 'unique' }),
    posts: relationship({ 
	  ref: 'Post.tags', 
      ui: {
        inlineEdit: { fields: ['name'] },
		hideCreate: true,
        linkToItem: true,
        inlineConnect: true,
        inlineCreate: { fields: ['name'] },
      },
	  many: true 
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
