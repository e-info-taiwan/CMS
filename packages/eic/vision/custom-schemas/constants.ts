export enum DonationType {
  ONE_TIME = 'one_time',
  PERIODIC = 'periodic',
}

export enum NewebpayStatus {
  Success = 'SUCCESS',
}

export enum PeriodType {
  DAY = 'D',
  WEEKLY = 'W',
  MONTHLY = 'M',
  YEARLY = 'Y',
}

export const DONATION_MAX_FAILURE_TIMES =
  Number(process.env.DONATION_MAX_FAILURE_TIMES) || 3
