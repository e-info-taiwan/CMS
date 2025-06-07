// @ts-ignore: no definition
import { list } from '@keystone-6/core'
import { relationship, text } from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    name: text({
      label: '作者姓名',
      validation: { isRequired: true },
    }),
    image: relationship({
      label: '作者照片',
      ref: 'Photo',
    }),
    bio: text({
      label: '簡介',
      ui: {
        displayMode: 'textarea',
      },
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

export default utils.addTrackingFields(listConfigurations)
