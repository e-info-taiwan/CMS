import { DonationType, PeriodType } from './constants'

export type NewebpayDonation = {
  type?: DonationType.ONE_TIME | DonationType.PERIODIC
  isCancelled?: boolean
  periodType?:
    | PeriodType.DAY
    | PeriodType.WEEKLY
    | PeriodType.MONTHLY
    | PeriodType.YEARLY
  periodPoint?: string
  expectedTotalAuthTimes?: number
  expectedAuthedTimes?: number
  expectedAuthDates?: string
  cronjobCheckDate?: string
  failureTimes?: number
}

export type PaymentStatusMap = {
  Success: string
}

export type Donation = NewebpayDonation
