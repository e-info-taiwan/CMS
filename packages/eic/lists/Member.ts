import { list } from '@keystone-6/core'
import { text, relationship, select, timestamp } from '@keystone-6/core/fields'
import { utils } from '@mirrormedia/lilith-core'

const { allowRoles, admin, moderator, editor } = utils.accessControl

const listConfigurations = list({
  fields: {
    firebaseId: text({
      label: 'Firebase ID',
      isIndexed: 'unique',
    }),
    lastName: text({
      label: '會員姓氏',
    }),
    firstName: text({
      label: '會員名字',
    }),
    avatar: relationship({
      ref: 'Photo',
      label: '會員頭貼照片',
    }),
    city: text({
      label: '居住地',
    }),
    birthDate: timestamp({
      label: '出生年月日',
    }),
    email: text({
      label: 'Email',
      isIndexed: 'unique',
    }),
    state: select({
      label: '狀態',
      type: 'string',
      options: [
        { label: '啟用', value: 'active' },
        { label: '停用', value: 'inactive' },
      ],
      defaultValue: 'active',
    }),
    favorites: relationship({
      ref: 'Favorite.member',
      label: '收藏文章',
      many: true,
    }),
    interestedSections: relationship({
      ref: 'Section',
      label: '感興趣分類',
      many: true,
    }),
    newsletterSubscription: select({
      label: '訂閱電子報狀態和版本',
      type: 'string',
      options: [
        { label: '未訂閱', value: 'none' },
        { label: '已訂閱 - 一般版', value: 'standard' },
        { label: '已訂閱 - 美化版', value: 'beautified' },
      ],
      defaultValue: 'none',
    }),
    newsletterFrequency: select({
      label: '電子報訂閱頻率',
      type: 'string',
      options: [
        { label: '每個工作日', value: 'weekday' },
        { label: '每週六', value: 'saturday' },
        { label: '兩者都有', value: 'both' },
      ],
      defaultValue: 'weekday',
    }),
  },
  ui: {
    listView: {
      initialColumns: [
        'email',
        'lastName',
        'firstName',
        'state',
        'newsletterSubscription',
      ],
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
  graphql: {
    cacheHint: { maxAge: 1200, scope: 'PUBLIC' },
  },
})

export default utils.addTrackingFields(listConfigurations)
