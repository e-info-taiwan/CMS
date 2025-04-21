import { list } from '@keystone-6/core'
import { text, integer } from '@keystone-6/core/fields'

import {
  allowRoles,
  admin,
  moderator,
  //editor,
  //owner,
} from '../../utils/accessControl'
import { addTrackingFields } from '../../utils/trackingHandler'
import { CustomRelationship } from '../../customFields/CustomRelationship'

//enum UserRole {
//  Admin = 'admin',
//  Moderator = 'moderator',
//  Editor = 'editor',
//  Contributor = 'contributor',
//}

const listConfigurations = list({
  fields: {
    slug: text({
      label: 'slug（Longform 網址）',
      isIndexed: 'unique',
      validation: {
        isRequired: true,
      },
    }),
    titleSize: integer({
      label: '標題字級（Longform 專用）',
      validation: {
        max: 200,
        min: 20,
      },
    }),
    titleColor: text({
      label: '標題顏色Hex color code（Longform 專用）',
      defaultValue: '#000',
      validation: {
        match: {
          regex: new RegExp('^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'),
          explanation: '標題顏色格式不符合 Hex color code',
        },
      },
    }),
    subtitle: text({
      label: '副標（Longform）',
      validation: {
        isRequired: false,
      },
    }),
    subtitleSize: integer({
      label: '副標字級（Longform 專用）',
      validation: {
        max: 100,
        min: 14,
      },
    }),
    subtitleColor: text({
      label: '副標顏色Hex color code（Longform 專用）',
      defaultValue: '#000',
      validation: {
        match: {
          regex: new RegExp('^^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'),
          explanation: '副標顏色格式不符合 Hex color code',
        },
      },
    }),
    headLogo: CustomRelationship({
      label: '自訂 Logo（Longform 專用）',
      ref: 'Photo',
      // ui: {
      //     hideCreate: true,
      // },
      customConfig: {
        isImage: true,
      },
    }),
    heroMob: CustomRelationship({
      label: '手機首圖',
      ref: 'Photo',
      // ui: {
      //     hideCreate: true,
      // },
      customConfig: {
        isImage: true,
      },
    }),
    author: text({
      label: '採訪',
      //ui: { displayMode: 'textarea' },
    }),
    photographer: text({
      label: '影像',
      //ui: { displayMode: 'textarea' },
    }),
    social: text({
      label: '數位暨社群運營',
      //ui: { displayMode: 'textarea' },
    }),
    designer: text({
      label: '視覺設計',
      //ui: { displayMode: 'textarea' },
    }),
    engineer: text({
      label: '網頁製作',
      //ui: { displayMode: 'textarea' },
    }),
    director: text({
      label: '監製',
      //ui: { displayMode: 'textarea' },
    }),
    byline_title: text({
      label: '參與職稱1',
      //ui: { displayMode: 'textarea' },
    }),
    byline_name: text({
      label: '參與成員1',
      //ui: { displayMode: 'textarea' },
    }),
    byline_title2: text({
      label: '參與職稱2',
      //ui: { displayMode: 'textarea' },
    }),
    byline_name2: text({
      label: '參與成員2',
      //ui: { displayMode: 'textarea' },
    }),
  },
  ui: {
    labelField: 'id',
    listView: {
      initialColumns: ['id'],
      initialSort: { field: 'id', direction: 'DESC' },
      pageSize: 50,
    },
  },

  access: {
    operation: {
      update: allowRoles(admin, moderator),
      create: allowRoles(admin, moderator),
      delete: allowRoles(admin),
    },
  },
})

export default addTrackingFields(listConfigurations)
