import { list } from '@keystone-6/core'
import { integer, text, relationship, checkbox } from '@keystone-6/core/fields'
import { addTrackingFields } from '../../utils/trackingHandler'
import { CustomRelationship } from '../../customFields/CustomRelationship'
import { allowRoles, admin, moderator, editor } from '../../utils/accessControl'

const listConfigurations = list({
  // ui: {
  //     isHidden: true,
  // },
  fields: {
    name: text({ label: '名稱', validation: { isRequired: true } }),
    slug: text({
      label: 'Slug（必填）',
      validation: { isRequired: true },
      isIndexed: 'unique',
    }),
    weight: integer({
      label: '權重',
      defaultValue: 5,
    }),
    events: relationship({
      ref: 'Event.category',
      ui: {
        displayMode: 'select',
        hideCreate: true,
      },
      many: true,
    }),
    heroImage: CustomRelationship({
      label: '首圖',
      ref: 'Photo',
      ui: {
        hideCreate: true,
      },
      customConfig: {
        isImage: true,
      },
    }),
    category: relationship({
      ref: 'Category.group',
      ui: {
        displayMode: 'select',
        hideCreate: true,
      },
      many: true,
    }),
    active: checkbox({ label: '啟用', defaultValue: true }),
    posts: relationship({
      ref: 'Post.group',
      many: true,
      ui: {
        displayMode: 'select',
        hideCreate: true,
      },
    }),
  },
  ui: {
    listView: {
      initialColumns: ['name', 'slug', 'weight', 'active'],
      initialSort: { field: 'weight', direction: 'DESC' },
      pageSize: 50,
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
