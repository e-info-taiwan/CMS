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
    subscriptions: relationship({
      ref: 'MemberSubscription.member',
      label: '訂閱方案',
      many: true,
    }),
  },
  ui: {
    listView: {
      initialColumns: ['email', 'lastName', 'firstName', 'state'],
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
