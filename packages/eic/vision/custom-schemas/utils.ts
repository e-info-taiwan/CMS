import { PeriodType } from './constants'
import type { Donation, PaymentStatusMap } from './types'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(customParseFormat)
dayjs.extend(utc)
dayjs.extend(timezone)

// use CUSTOM_TZ instead of TZ to prevent from affecting other functionality in the system
const customTZ = process.env.CUSTOM_TZ ?? 'Asia/Taipei'

/**
 *  @typedef {import('dayjs').Dayjs} Dayjs
 *
 *  @param  {string}  dateString
 *  @param  {string}  format
 *  @param  {string}  [timezone='Asia/Taipei']
 *  @throws {Error}
 *  @return {Dayjs}
 */
function dateWithTZ(dateString, format = undefined, timezone = customTZ) {
  return dayjs.tz(dateString, format, timezone)
}

/**
 * transform collection object into string representation of list
 *
 * @param   {Object} collection
 * @throws  {Error}
 * @return  {string}
 */
function collectionToListString(collection: object): string {
  return `[${Object.values(collection)
    .map((element) => `'${element}'`)
    .join(',')}]`
}

/**
 * DonationManager is responsible for creating donation mutation
 */
class DonationManager {
  delimiter = ','
  seriesDateStringFormat = 'YYYY-MM-DD'
  paymentStatusMap: PaymentStatusMap

  /**
   * Create a manager instance
   *
   * @param {PaymentStatusMap} paymentStatusMap
   */
  constructor(paymentStatusMap: PaymentStatusMap) {
    this.paymentStatusMap = paymentStatusMap
  }

  /**
   * retrieve donation mutation for payment result of one-time donation
   *
   * @return {Donation}
   */
  getOneTimeUpdateInput(): Donation {
    const updateDonationInput: Donation = {}

    updateDonationInput.cronjobCheckDate = null

    return updateDonationInput
  }

  /**
   * retrieve donation mutation for payment result of periodic donation
   *
   * @param  {Object}     opts
   * @param  {Donation}   opts.oldDonation
   * @param  {Donation}   opts.newDonation
   * @param  {string}     opts.paymentStatus
   * @param  {string}     opts.paymentTime
   * @param  {string}     [opts.nextAuthDate]
   * @throws {Error}
   * @return {Donation}
   */
  getPeriodUpdateInput(
    {
      oldDonation,
      newDonation,
      paymentStatus,
      paymentTime,
      nextAuthDate,
    }: {
      oldDonation: Donation
      newDonation: Donation
      paymentStatus: string
      paymentTime: string
      nextAuthDate?: string
    } = {
      oldDonation: {},
      newDonation: {},
      paymentStatus: '',
      paymentTime: '',
    }
  ): Donation {
    const updateDonationInput: Donation = {}

    const {
      periodType,
      periodPoint,
      expectedTotalAuthTimes: oldTotalAuthTimes,
      expectedAuthedTimes: oldAuthedTimes,
      expectedAuthDates: oldAuthDates,
    } = oldDonation
    const {
      expectedTotalAuthTimes: newTotalAuthTimes,
      expectedAuthedTimes: newAuthedTimes,
      expectedAuthDates: newAuthDates,
    } = newDonation

    if (!(Number.isInteger(newAuthedTimes) && newAuthedTimes >= 0)) {
      throw new Error(
        `newDonation.expectedAuthedTimes should be integer >= 0, but got ${newAuthedTimes}`
      )
    }

    if (
      !(
        typeof newTotalAuthTimes === 'undefined' ||
        (Number.isInteger(newTotalAuthTimes) && newTotalAuthTimes >= 0)
      )
    ) {
      throw new Error(
        `newDonation.expectedTotalAuthTimes should be either undefined or integer >= 0, but got ${newAuthedTimes}`
      )
    }

    // fails on first installment will cause whole period been cancelled
    if (
      newAuthedTimes === 1 &&
      paymentStatus !== this.paymentStatusMap.Success
    ) {
      updateDonationInput.cronjobCheckDate = null
      updateDonationInput.isCancelled = true
      updateDonationInput.expectedTotalAuthTimes =
        newTotalAuthTimes ?? oldTotalAuthTimes
      updateDonationInput.expectedAuthedTimes = newAuthedTimes
      updateDonationInput.expectedAuthDates = newAuthDates ?? oldAuthDates

      return updateDonationInput
    }

    // payment data comes from each installment result
    if (
      Number.isInteger(newTotalAuthTimes) &&
      typeof nextAuthDate === 'string'
    ) {
      if (newAuthedTimes < newTotalAuthTimes) {
        let date
        try {
          date = dateWithTZ(nextAuthDate, 'YYYY-MM-DD')
        } catch (err) {
          throw new Error(`'${nextAuthDate}' is not a valid date string`)
        }
        updateDonationInput.cronjobCheckDate = date.toISOString()
      } else {
        updateDonationInput.cronjobCheckDate = null
      }
      updateDonationInput.expectedAuthedTimes = newAuthedTimes

      if (oldAuthDates === '' || oldTotalAuthTimes !== newTotalAuthTimes) {
        updateDonationInput.expectedTotalAuthTimes = newTotalAuthTimes
        updateDonationInput.expectedAuthDates = this.generateDateSeries({
          totalAuthTimes: newTotalAuthTimes,
          authedTimes: newAuthedTimes,
          authTime: paymentTime,
          periodType,
          periodPoint,
        }).join(this.delimiter)
      }

      return updateDonationInput
    }

    // payment data comes from period intitalization result
    if (typeof newAuthDates === 'string') {
      updateDonationInput.expectedAuthDates = newAuthDates
      updateDonationInput.expectedTotalAuthTimes = newTotalAuthTimes
      updateDonationInput.expectedAuthedTimes = newAuthedTimes

      const date = dateWithTZ(
        newAuthDates.split(this.delimiter)[newAuthedTimes] ?? null,
        'YYYY-MM-DD'
      )
      updateDonationInput.cronjobCheckDate = date.isValid()
        ? date.toISOString()
        : null

      return updateDonationInput
    }

    // payment data comes from result of single payment detail query
    if (!(newAuthDates || nextAuthDate)) {
      const authDateSeries =
        (oldAuthDates !== ''
          ? oldAuthDates?.split(this.delimiter)
          : undefined) ??
        this.generateDateSeries({
          totalAuthTimes: oldTotalAuthTimes,
          authedTimes: newAuthedTimes,
          authTime: paymentTime,
          periodType,
          periodPoint,
        })

      updateDonationInput.expectedAuthDates = authDateSeries.join(
        this.delimiter
      )
      const authedTimes = Math.max(newAuthedTimes, oldAuthedTimes)
      updateDonationInput.expectedAuthedTimes = authedTimes
      updateDonationInput.cronjobCheckDate =
        authedTimes < oldTotalAuthTimes
          ? dateWithTZ(authDateSeries[authedTimes]).toISOString()
          : null

      return updateDonationInput
    }

    throw new Error(
      `input data doesn't match any condictions. input data is ${JSON.stringify(
        {
          paymentStatus,
          paymentTime,
          nextAuthDate,
          oldDonation,
          newDonation,
        }
      )}`
    )
  }

  /**
   * calculate date string series waiting for authorization
   *
   * @param   {Object}  opts
   * @param   {number}  [opts.totalAuthTimes=1]
   * @param   {number}  [opts.authedTimes=1]
   * @param   {string}  [opts.authTime]
   * @param   {string}  [opts.periodType='']
   * @param   {string}  [opts.periodPoint='']
   * @return  {string}
   */
  private generateDateSeries(
    { totalAuthTimes, authedTimes, authTime, periodType, periodPoint } = {
      totalAuthTimes: 1,
      authedTimes: 1,
      authTime: dateWithTZ(new Date()).toISOString(),
      periodType: '',
      periodPoint: '',
    }
  ): string[] {
    // use authTime, authedTimes periodType, periodPoint information to figure out the start time of whole period,
    // then use it with totalAuthTimes to generate whole date series

    switch (periodType) {
      case PeriodType.DAY: {
        // when periodType is DAY, periodPoint should be 2 ~ 999,
        // it represents day interval between installments

        const dayInterval = Number(periodPoint)
        const startOfPeriod = dateWithTZ(authTime).subtract(
          dayInterval * (authedTimes - 1),
          'day'
        )

        const dateSeries: string[] = []
        for (let times = 0; times < totalAuthTimes; times += 1) {
          const dateString = dateWithTZ(startOfPeriod)
            .add(dayInterval * times, 'day')
            .format(this.seriesDateStringFormat)
          dateSeries.push(dateString)
        }

        return dateSeries
      }
      case PeriodType.WEEKLY: {
        // when periodType is WEEKLY, periodPoint should be 1 ~ 7,
        // it represents day of week (1 for Monday, 7 for Sunday)

        // NewebPay uses 1 (Monday) to 7 (Sunday), but dayjs uses 0 (Sunday) - 6 (Saturday),
        // so we need to do conversion on it
        const weekday = Number(periodPoint) % 7

        const startOfPeriod = dateWithTZ(authTime)
          .day(weekday)
          .subtract(authedTimes - 1, 'week')

        const dateSeries: string[] = []
        for (let times = 0; times < totalAuthTimes; times += 1) {
          const dateString = dateWithTZ(startOfPeriod)
            .add(times, 'week')
            .format(this.seriesDateStringFormat)
          dateSeries.push(dateString)
        }

        return dateSeries
      }
      case PeriodType.MONTHLY: {
        // when periodType is MONTHLY, periodPoint shoud be 1 ~ 31,
        // it represents date of month (1 for 1st, 31 for 31th)

        let startOfPeriod
        const date = Number(periodPoint)

        // dayjs will bubble up to the month when date exceeds range, but NewebPay doesn't,
        // if bubble happens, we should use previous month for calculation
        const t1 = dateWithTZ(authTime)
        const t2 = dateWithTZ(authTime).date(date)

        if (t2.isAfter(t1, 'date')) {
          startOfPeriod = t1
            .subtract(1, 'month')
            .date(date)
            .subtract(authedTimes - 1, 'month')
        } else {
          startOfPeriod = t2.subtract(authedTimes - 1, 'month')
        }

        const dateSeries: string[] = []
        for (let times = 0; times < totalAuthTimes; times += 1) {
          const dateString = dateWithTZ(startOfPeriod)
            .add(times, 'month')
            .format(this.seriesDateStringFormat)
          dateSeries.push(dateString)
        }

        return dateSeries
      }
      case PeriodType.YEARLY: {
        // when periodType is YEARLY,
        // format of periodPoint is MMDD (MM stands for month and DD stands for date),

        // some date don't happen on each year, e.g. 0229,
        // so we need to find a proper year has the date
        const month = periodPoint.slice(0, 2)
        let year = dateWithTZ(authTime).year()
        let m1
        let m2
        do {
          const yearStr = String(year).padStart(4, '0')
          m1 = dateWithTZ(`${yearStr}${periodPoint}`, 'YYYYMMDD')
          m2 = dateWithTZ(`${yearStr}${month}`, 'YYYYMM')
          year -= 1
          authedTimes -= 1
        } while (m1.month() !== m2.month() && authedTimes >= 0)

        authedTimes += 1
        const startOfPeriod = m1.subtract(authedTimes - 1, 'year')

        const dateSeries: string[] = []
        for (let times = 0; times < totalAuthTimes; times += 1) {
          const dateString = dateWithTZ(startOfPeriod)
            .add(times, 'year')
            .format(this.seriesDateStringFormat)
          dateSeries.push(dateString)
        }

        return dateSeries
      }
      default: {
        throw new Error(
          `periodType should be one of ${collectionToListString(
            PeriodType
          )}, but got ${periodType}`
        )
      }
    }
  }
}

export default {
  DonationManager,
  collectionToListString,
  dateWithTZ,
}
