import { list } from '@keystone-6/core'
import { text, integer, relationship } from '@keystone-6/core/fields'
import { addTrackingFields } from '../../utils/trackingHandler'
import { allowRoles, admin, moderator, editor } from '../../utils/accessControl'

const listConfigurations = list({
  // ui: {
  //     isHidden: true,
  // },
  fields: {
    name: text({
      label: '選項',
      validation: { isRequired: true },
      isIndexed: 'unique',
    }),
    order: integer({
      isOrderable: true,
    }),
    poll: relationship({
      ref: 'Poll.options',
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
    result: relationship({
      ref: 'PollResult.option',
      ui: {
        hideCreate: true,
      },
      many: true,
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
  hooks: {
    validateInput: async ({ resolvedData, context, addValidationError }) => {
      const { disconnect = [] } = resolvedData?.poll || {}

      for (let i = 0; i < disconnect.length; i++) {
        const poll = disconnect[i]
        const optionCount = await context.db.PollOption.count({
          where: {
            poll: {
              some: {
                id: {
                  equals: poll?.id,
                },
              },
            },
          },
        })
        console.log(optionCount)
        if (optionCount <= 1) {
          addValidationError(`Poll ID: ${poll.id} 只有這個選項，因此無法刪除。`)
        }
      }
    },
    validateDelete: async ({ context, item, addValidationError }) => {
      const relatedPollList = await context.db.Poll.findMany({
        where: {
          options: { some: { id: { equals: item?.id } } },
        },
      })
      // throw error if one of polls just have one option
      for (let i = 0; i < relatedPollList.length; i++) {
        const poll = relatedPollList[i]
        const optionCount = await context.db.PollOption.count({
          where: {
            poll: {
              some: {
                id: {
                  equals: poll?.id,
                },
              },
            },
          },
        })
        if (optionCount <= 1) {
          addValidationError(
            `Poll ${poll.id} ${poll.name} 只有這個選項，因此無法刪除。`
          )
        }
      }
    },
  },
})

export default addTrackingFields(listConfigurations)
