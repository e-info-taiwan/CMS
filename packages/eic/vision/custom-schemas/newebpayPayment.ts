import { DonationType, NewebpayStatus } from './constants'
import utils from './utils'
import type { NewebpayDonation } from './types'

const DonatoinManager = utils.DonationManager
const donationManager = new DonatoinManager(NewebpayStatus)

export const typeDefs = `
input RawNewebpayPaymentInput {
  amount: Int!
  status: String!
  paymentTime: String!
  paymentMethod: String
  tradeNumber: String
  message: String
  merchantId: String!
  orderNumber: String!
  tokenUseStatus: Int
  respondCode: String
  ECI: String
  authCode: String
  authBank: String
  cardInfoLastFour: String
  cardInfoFirstSix: String
  cardInfoExp: String
  totalTimes: String
  alreadyTimes: String
  expectedAuthDates: String
  nextAuthDate: String
  donationOrderNumber: String!
}

type Mutation {
  """
  Create a newebpay payment and update its corresponding donation which matches all the following conditions
  1. orderNumber === donationOrderNumber
  """
  createNewebpayPaymentAndUpdateDonation(paymentData: RawNewebpayPaymentInput!): NewebpayPayment
}
`

export const resolvers = {
  Mutation: {
    createNewebpayPaymentAndUpdateDonation: async (
      root,
      { paymentData },
      context
    ) => {
      const {
        totalTimes,
        alreadyTimes,
        expectedAuthDates,
        nextAuthDate,
        donationOrderNumber,
        ...paymentCreateInput
      } = paymentData

      if (isNaN(Date.parse(paymentData.paymentTime))) {
        throw new Error('paymentData.paymentTime is a invalid date string')
      }

      let updateDonationInput: NewebpayDonation = {}

      try {
        const where = {
          orderNumber: donationOrderNumber,
        }

        const targetDonation: NewebpayDonation =
          await context.prisma.donation.findFirst({
            where,
          })

        if (!targetDonation) {
          throw new Error(
            `Donation with where condition: ${JSON.stringify(
              where
            )} is not found`
          )
        }

        switch (targetDonation.type) {
          case DonationType.ONE_TIME: {
            updateDonationInput = donationManager.getOneTimeUpdateInput()
            break
          }
          case DonationType.PERIODIC: {
            updateDonationInput = donationManager.getPeriodUpdateInput({
              oldDonation: targetDonation,
              newDonation: {
                expectedTotalAuthTimes:
                  typeof totalTimes === 'undefined'
                    ? totalTimes
                    : Number(totalTimes),
                expectedAuthedTimes: Number(alreadyTimes),
                expectedAuthDates,
              },
              paymentStatus: paymentData.status,
              paymentTime: paymentData.paymentTime,
              nextAuthDate,
            })
            break
          }
          default: {
            throw new Error(
              `type should be one of ${utils.collectionToListString(
                DonationType
              )}, but got ${targetDonation.type}`
            )
          }
        }

        const updatedAt = new Date().toISOString()

        // update donation record in databsase
        const updateDonation = context.prisma.donation.updateMany({
          where,
          data: {
            updatedAt,
            ...updateDonationInput,
          },
        })

        // create newebpayPayment record in database
        const createNewebpayPayment = context.prisma.newebpayPayment.create({
          data: {
            totalTimes,
            alreadyTimes,
            createdAt: updatedAt,
            ...paymentCreateInput,
            donation: {
              // add relationship to the donation
              connect: {
                orderNumber: donationOrderNumber,
              },
            },
          },
        })

        const txns = [updateDonation, createNewebpayPayment]

        const [updateResult, createResult] = await context.prisma.$transaction(
          txns
        )

        if (updateResult?.count !== 1) {
          throw new Error(
            `Unpexected count ${
              updateResult?.count
            } of updating donation with orderNumber: ${donationOrderNumber}. Update value would be ${JSON.stringify(
              updateDonationInput
            )}`
          )
        }

        return createResult
      } catch (err) {
        console.error(err)
        // TODO wrap err without new Error
        throw new Error(
          `Can not update donation with orderNumber: ${donationOrderNumber}. Update value would be ${JSON.stringify(
            updateDonationInput
          )}`
        )
      }
    },
  },
}

export default {
  typeDefs,
  resolvers,
}
