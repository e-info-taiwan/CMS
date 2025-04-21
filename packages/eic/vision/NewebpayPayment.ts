import { list } from '@keystone-6/core'
import { text, integer, relationship, timestamp } from '@keystone-6/core/fields'
import { allowRoles, admin, moderator } from '../../utils/accessControl'

import { addTrackingFields } from '../../utils/trackingHandler'

const listConfigurations = list({
  fields: {
    donation: relationship({
      label: '捐款訂單',
      ref: 'Donation.newebpayPayment',
      ui: {
        linkToItem: true,
        displayMode: 'cards',
        cardFields: ['name', 'amount', 'orderNumber'],
        hideCreate: true,
      },
    }),
    status: text({
      label: '交易結果',
      validation: {
        isRequired: true,
      },
    }),
    message: text({
      label: '交易狀態',
      ui: { displayMode: 'textarea' },
      validation: {
        isRequired: true,
      },
    }),
    paymentMethod: text({
      label: '交易方式',
    }),
    amount: integer({
      label: '捐款金額',
      // adminDoc: '幣值為新台幣',
      validation: {
        isRequired: true,
      },
    }),
    paymentTime: timestamp({
      label: '交易時間',
      validation: {
        isRequired: true,
      },
    }),
    orderNumber: text({
      label: '訂單編號',
      validation: {
        isRequired: true,
      },
      isIndexed: 'unique',
    }),
    tradeNumber: text({
      label: '交易序號',
    }),
    merchantId: text({
      label: '商店代號',
      validation: {
        isRequired: true,
      },
    }),
    tokenUseStatus: integer({
      label: '信用卡快速結帳使用狀態',
      /*
      adminDoc: `
        0=該筆交易為非使用信用卡快速結帳功能。
        1=該筆交易為首次設定信用卡快速結帳功能。
        2=該筆交易為使用信用卡快速結帳功能。
        9=該筆交易為取消信用卡快速結帳功能功能。
      `,
      */
    }),
    respondCode: text({
      label: '金融機構回應碼',
      // adminDoc:'1.由收單機構所回應的回應碼。2.若交易送至收單機構授權時已是失敗狀態，則本欄位的值會以空值回傳。3.銀行回應碼 00 代表刷卡成功，其餘為刷卡失敗',
    }),
    ECI: text({
      label: 'ECI',
      // adminDoc:'1.3D 回傳值 eci=1,2,5,6，代表為 3D 交易。2.若交易送至收單機構授權時已是失敗狀態，則本欄位的值會以空值回傳。',
    }),
    authCode: text({
      label: '收單機構授權碼',
      // adminDoc:'1.由收單機構所回應的授權碼。2.若交易送至收單機構授權時已是失敗狀態，則本欄位的值會以空值回傳。',
    }),
    authBank: text({
      label: '收單機構',
      // adminDoc: '該筆交易的收單機構。',
    }),
    cardInfoLastFour: text({
      label: '信用卡後四碼',
    }),
    cardInfoFirstSix: text({
      label: '信用卡前六碼',
    }),
    cardInfoExp: text({
      label: '卡號到期日',
    }),
    totalTimes: text({
      label: '授權總期數',
    }),
    alreadyTimes: text({
      label: '已授權次數',
    }),
  },

  ui: {
    labelField: 'tradeNumber',
    listView: {
      initialColumns: ['tradeNumber', 'paymentMethod', 'status', 'paymentTime'],
    },
  },
  access: {
    operation: {
      query: allowRoles(admin, moderator),
      create: allowRoles(admin, moderator),
      update: allowRoles(admin, moderator),
      delete: allowRoles(admin),
    },
  },
})

export default addTrackingFields(listConfigurations)
