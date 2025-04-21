import { list } from '@keystone-6/core'
import { allowRoles, admin, moderator, editor } from '../../utils/accessControl'
import { text, checkbox, relationship } from '@keystone-6/core/fields'
import { CustomRelationship } from '../../customFields/CustomRelationship'
import { CustomFile } from '../../customFields'
import { addTrackingFields } from '../../utils/trackingHandler'
import { GcsFileAdapter } from '../../customFields/CustomFile/GcsFileAdapter'

const gcsFileAdapter = new GcsFileAdapter('file')

const listConfigurations = list({
  // ui: {
  //     isHidden: true,
  // },
  fields: {
    name: text({
      label: '標題',
	  validation: {
		isRequired: true, 
	  }
    }),
	/*
	url: text({
	  label: '網址',
	  validation: {
		isRequired: true, 
	  }
	}),
	*/
    file: CustomFile({
      label: '檔案（PDF/Word/AI）',
      customConfig: {
        fileType: 'file',
      },
    }),
    url: text({
      ui: {
         createView: { fieldMode: 'hidden' },
         itemView: { fieldMode: 'read' },
      },
    }),
    active: checkbox({ label: '啟用', defaultValue: true }),
    latest: relationship({
      ref: 'LatestNew.download',
      ui: {
		hideCreate: true, 
        displayMode: 'select',
        cardFields: ['name'],
        inlineEdit: { fields: ['name'] },
        linkToItem: true,
        inlineConnect: true,
        inlineCreate: { fields: ['name'] },
      },
      many: true,
    }),
    influence: relationship({
      ref: 'Influence.download',
      ui: {
        displayMode: 'select',
		hideCreate: true, 
        cardFields: ['name'],
        inlineEdit: { fields: ['name'] },
        linkToItem: true,
        inlineConnect: true,
        inlineCreate: { fields: ['name'] },
      },
      many: true,
    }),
  },
  ui: {
    labelField: 'name',
	description: '下載檔案',
	listView: {
	  initialColumns: ['name', 'url'],
	  initialSort: { field: 'id', direction: 'DESC' },
	  pageSize: 50,
	},
  },
  access: {
    operation: {
      query: () => true,
      update: allowRoles(admin, moderator, editor),
      create: allowRoles(admin, moderator, editor),
      delete: allowRoles(admin),
    },
  },
  hooks: {
    resolveInput: async ({ inputData, item, resolvedData }) => {
      await gcsFileAdapter.startFileProcessingFlow(
        resolvedData,
        item,
        inputData
      )

      return resolvedData
    },
  },
})

export default addTrackingFields(listConfigurations)
