import { list, graphql } from '@keystone-6/core'
import {
  float,
  text,
  select,
  checkbox,
  virtual,
  relationship,
  integer,
  timestamp,
} from '@keystone-6/core/fields'
import { allowRoles, admin, moderator } from '../../utils/accessControl'
import { addTrackingFields } from '../../utils/trackingHandler'
import { DonationType } from './custom-schemas/constants'
import utils from './custom-schemas/utils'

const { dateWithTZ } = utils

const listConfigurations = list({
  fields: {
    orderNumber: text({
      label: '訂單編號',
      validation: {
        isRequired: true,
      },
      isIndexed: 'unique',
    }),
    type: select({
      label: '捐款類型',
      type: 'enum',
      options: [
        { label: '單次', value: DonationType.ONE_TIME },
        { label: '定期', value: DonationType.PERIODIC },
      ],
      defaultValue: 'one_time',
      validation: {
        isRequired: true,
      },
    }),
    paymentMethod: select({
      label: '付款方式',
      type: 'enum',
      options: [{ label: '藍新支付', value: 'newebpay' }],
      defaultValue: 'newebpay',
      validation: {
        isRequired: true,
      },
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
    newebpayPayment: relationship({
      label: '藍新付費記錄',
      ref: 'NewebpayPayment.donation',
      many: true,
      ui: {
        labelField: 'tradeNumber',
        hideCreate: true,
      },
    }),
    amount: float({
      label: '捐款金額',
      validation: {
        isRequired: true,
        min: 1,
      },
    }),
    currency: select({
      label: '貨幣別',
      type: 'enum',
      options: [{ label: '新臺幣', value: 'TWD' }],
      defaultValue: 'TWD',
      validation: {
        isRequired: true,
      },
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
    name: text({
      label: '姓名',
      validation: {
        isRequired: true,
      },
    }),
    email: text({
      label: 'email',
      validation: {
        isRequired: true,
      },
    }),
    phone: text({
      label: '電話',
      validation: {
        isRequired: true,
      },
    }),
    address: text({
      label: '地址',
    }),
    shouldInvoice: checkbox({
      label: '是否要開立收據（打勾代表要開立）',
      defaultValue: false,
    }),
    paperInvoice: checkbox({
      label: '是否要紙本收據（打勾代表要開立）',
      defaultValue: false,
    }),
    donorTitle: text({
      label: '收據抬頭',
    }),
    donorSerial: text({
      label: '身份證字號／統一編號',
    }),
    shouldGift: virtual({
      label: '是否需要贈品',
      field: graphql.field({
        type: graphql.Boolean,
        resolve(item: Record<string, unknown>): boolean {
          return !!item.gift
        },
      }),
    }),
    gift: text({
      label: '贈品名稱',
    }),

    // It means the peridic donation is cancelled
    isCancelled: checkbox({
      label: '定期定額捐款是否取消（打勾代表取消）',
      defaultValue: false,
    }),

    periodType: select({
      label: '週期類別',
      type: 'enum',
      options: [
        { label: '固定天期制', value: 'D' },
        { label: '每週', value: 'W' },
        { label: '每月', value: 'M' },
        { label: '每年', value: 'Y' },
      ],
      ui: {
        createView: {
          fieldMode: 'hidden',
        },
        itemView: {
          fieldMode: 'read',
        },
      },
    }),

    periodPoint: text({
      label: '交易週期授權時間',
      ui: {
        createView: {
          fieldMode: 'hidden',
        },
        itemView: {
          fieldMode: 'read',
        },
      },
      /*
      adminDoc: `
        當週期類別為 D 時，允許數值範圍為 2-999，代表每隔 X 天執行，從授權日隔日起算；
        當週期類別為 W 時，允許數值範圍為 1-7，代表每週一至週日；
        當週期類別為 M 時，允許數值範圍為 01-31，代表每月 1 號至 31 號，如當月沒該日期，則使用最後一天；
        當週期類別為 Y 時，允許數值格式為 MMDD，代表每年的幾月幾日。
      `,
      */
    }),

    expectedTotalAuthTimes: integer({
      label: '預估總授權次數',
      defaultValue: 1,
      ui: {
        createView: {
          fieldMode: 'hidden',
        },
        itemView: {
          fieldMode: 'read',
        },
      },
    }),

    expectedAuthedTimes: integer({
      label: '預估已授權次數',
      defaultValue: 1,
      ui: {
        createView: {
          fieldMode: 'hidden',
        },
        itemView: {
          fieldMode: 'read',
        },
      },
    }),

    expectedAuthDates: text({
      label: '預估授權排程日期',
      ui: {
        displayMode: 'textarea',
        createView: {
          fieldMode: 'hidden',
        },
        itemView: {
          fieldMode: 'read',
        },
      },
    }),

    cronjobCheckDate: timestamp({
      label: '開始檢查日期',
      ui: {
        createView: {
          fieldMode: 'hidden',
        },
        itemView: {
          fieldMode: 'read',
        },
      },
    }),

    failureTimes: integer({
      label: '失敗次數',
      defaultValue: 0,
      ui: {
        createView: {
          fieldMode: 'hidden',
        },
        itemView: {
          fieldMode: 'read',
        },
      },
    }),
  },
  ui: {
    labelField: 'orderNumber',
    listView: {
      initialColumns: ['orderNumber', 'type', 'amount', 'name'],
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
  hooks: {
    resolveInput: ({ resolvedData, operation }) => {
      if (operation !== 'create') {
        return resolvedData
      }

      const { type, periodType, periodPoint } = resolvedData
      if (type === DonationType.PERIODIC) {
        if (!periodType && !periodPoint) {
          // set periodType to M (monthly) and set periodPoint to next day
          resolvedData.periodType = 'M'
          resolvedData.periodPoint = dateWithTZ(new Date()).format('DD')
        }
      }

      // add a least one day buffer
      resolvedData.cronjobCheckDate = dateWithTZ(new Date())
        .add(2, 'days')
        .startOf('day')
        .toISOString()

      return resolvedData
    },
    validateInput: async ({ resolvedData, operation, addValidationError }) => {
      if (operation !== 'create') {
        return
      }
      // validate invoice-or-gift-related data
      const { shouldInvoice, shouldGift, address } = resolvedData

      if (shouldInvoice) {
        // 開立收據

        const { donorTitle, donorSerial } = resolvedData

        if (!donorTitle) {
          addValidationError(
            '[CreateDonationError] missing data in donorTitle, please check the field again.'
          )
        }

        if (!donorSerial) {
          addValidationError(
            '[CreateDonationError] missing data in donorSerial, please check the field again.'
          )
        }
      }

      if (shouldInvoice || shouldGift) {
        // 要開立收據或收受贈品情況下，地址不可為空

        if (!address) {
          addValidationError(
            '[CreateDonationError] missing data in address, please check the field again.'
          )
        }
      }

      // validate periodic donation related data
      const { type, periodType, periodPoint } = resolvedData
      if (type === DonationType.PERIODIC) {
        switch (periodType) {
          case 'D': {
            // 每隔X天 (X=2-999)
            const x = Number(periodPoint)
            if (Number.isNaN(x) || x > 999 || x < 2) {
              addValidationError(
                '[CreateDonationError] invalid data in periodPoint when periodType is D, please check the field again.'
              )
            }
            break
          }
          case 'W': {
            // 每星期X (X=1-7)
            const x = Number(periodPoint)
            if (Number.isNaN(x) || x > 7 || x < 1) {
              addValidationError(
                '[CreateDonationError] invalid data in periodPoint when periodType is W, please check the field again.'
              )
            }
            break
          }
          case 'M': {
            // 每月X號 (X=01-31)
            const x = Number(periodPoint)
            if (
              periodPoint.length !== 2 ||
              Number.isNaN(x) ||
              x > 31 ||
              x < 1
            ) {
              addValidationError(
                '[CreateDonationError] invalid data in periodPoint when periodType is M, please check the field again.'
              )
            }
            break
          }
          case 'Y': {
            // 每年X月Y日 (X=01-12, Y=01-31)
            const isValid = dateWithTZ(periodPoint, 'MMDD').isValid()
            if (!isValid) {
              addValidationError(
                '[CreateDonationError] invalid data in periodPoint when periodType is Y, please check the field again.'
              )
            }
            break
          }
          default: {
            addValidationError(
              '[CreateDonationError] invalid data in periodType when type is periodic, please check the field again.'
            )
            break
          }
        }
      }

      // NewebPay specific validation
      const { paymentMethod, amount } = resolvedData
      if (paymentMethod === 'newebpay') {
        const MAX_AMOUNT_OF_NEWEBPAY = 2147483647 // 2 ^ 31 - 1
        if (amount > MAX_AMOUNT_OF_NEWEBPAY) {
          addValidationError(
            '[CreateDonationError] amount exceeds upper bound of NewebPay system, please check the field again.'
          )
        }
      }
    },
  },
})

export default addTrackingFields(listConfigurations)
