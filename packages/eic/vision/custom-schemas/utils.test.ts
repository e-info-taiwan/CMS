import utils from './utils'
import { NewebpayStatus, PeriodType } from './constants'
import type { Donation } from './types'

const DonationManager = utils.DonationManager

describe('Timezones', () => {
  it('should always be UTC', () => {
    expect(new Date().getTimezoneOffset()).toBe(0)
  })
})

describe('DonationManager', () => {
  it('constructor', () => {
    const paymentStatusMap = {
      Success: 'SUCCESS',
    }

    const manager = new DonationManager(paymentStatusMap)
    expect(manager.paymentStatusMap).toBe(paymentStatusMap)
  })

  describe('getOneTimeUpdateInput()', () => {
    const paymentStatusMap = {
      Success: 'SUCCESS',
    }

    const manager = new DonationManager(paymentStatusMap)

    it('method shoud be defined', () => {
      expect(typeof manager.getOneTimeUpdateInput).toBe('function')
    })

    it('returns an object', () => {
      const expectResult: Donation = {
        cronjobCheckDate: null,
      }

      const result = manager.getOneTimeUpdateInput()
      expect(result).toMatchObject(expectResult)
    })
  })

  describe('method getPeriodUpdateInput()', () => {
    const paymentStatusMap = {
      Success: 'SUCCESS',
    }

    const manager = new DonationManager(paymentStatusMap)

    it('method shoud be defined', () => {
      expect(typeof manager.getPeriodUpdateInput).toBe('function')
    })

    describe('input value', () => {
      it('throws error when oldDonation is not an object', () => {
        const mockInput = {
          oldDonation: null,
          newDonation: {},
          paymentStatus: '',
          paymentTime: '',
        }

        expect(() => manager.getPeriodUpdateInput(mockInput)).toThrowError(
          /oldDonation/
        )
      })

      it('throws error when newDonation is not an object', () => {
        const mockInput = {
          oldDonation: {},
          newDonation: null,
          paymentStatus: '',
          paymentTime: '',
        }

        expect(() => manager.getPeriodUpdateInput(mockInput)).toThrowError(
          /newDonation/
        )
      })

      it('throws error when expectedAuthedTimes of newDonation is not an integer >= 0', () => {
        const mockInput = {
          oldDonation: {},
          newDonation: {
            expectedAuthedTimes: -1,
          },
          paymentStatus: '',
          paymentTime: '',
        }

        expect(() => manager.getPeriodUpdateInput(mockInput)).toThrowError(
          /newDonation\.expectedAuthedTimes/
        )
      })

      it('throws error when expectedTotalAuthTimes of newDonation is neither undefined nor an integer >= 0', () => {
        const mockInput = {
          oldDonation: {},
          newDonation: {
            expectedTotalAuthTimes: null,
            expectedAuthedTimes: 0,
          },
          paymentStatus: '',
          paymentTime: '',
        }

        expect(() => manager.getPeriodUpdateInput(mockInput)).toThrowError(
          /newDonation\.expectedTotalAuthTimes/
        )
      })
    })

    describe('input scenarios', () => {
      describe('case: first installment failed', () => {
        // newDonation.expectedAuthedTimes

        it('donation should be cancelled ', () => {
          const mockInput = {
            oldDonation: {},
            newDonation: {
              expectedAuthedTimes: 1,
            },
            paymentStatus: 'FAIL',
            paymentTime: '2022-09-16T14:51:38.829Z',
            nextAuthDate: '2022-10-16T14:51:38.829Z',
          }
          const expectResult: Donation = {
            isCancelled: true,
            cronjobCheckDate: null,
          }

          const result = manager.getPeriodUpdateInput(mockInput)
          expect(result).toMatchObject(expectResult)
        })
      })

      describe('case: result of period creation', () => {
        // newDonation.expectedAuthedTimes, newDonation.expectedTotalAuthTimes, newDonation.expectedAuthDates

        it('donation should be updated properly', () => {
          const mockInput = {
            oldDonation: {
              expectedTotalAuthTimes: 1200,
              expectedAuthedTimes: 1,
            },
            newDonation: {
              expectedTotalAuthTimes: 3,
              expectedAuthedTimes: 1,
              expectedAuthDates: '2022-09-16,2022-10-16,2022-11-16',
            },
            paymentStatus: NewebpayStatus.Success,
            paymentTime: '2022-09-16T14:51:38.829Z',
            nextAuthDate: undefined,
          }
          const expectResult: Donation = {
            expectedTotalAuthTimes: 3,
            expectedAuthedTimes: 1,
            expectedAuthDates: '2022-09-16,2022-10-16,2022-11-16',
            cronjobCheckDate: '2022-10-15T16:00:00.000Z',
          }

          const result = manager.getPeriodUpdateInput(mockInput)
          expect(result).toMatchObject(expectResult)
        })
      })

      describe('case: result of installment', () => {
        // newDonation.expectedAuthedTimes, newDonation.expectedTotalAuthTimes, newDonation.nextAuthDate

        it('first monthly installment', () => {
          const mockInput = {
            oldDonation: {
              expectedTotalAuthTimes: 1200,
              expectedAuthedTimes: 1,
              periodType: PeriodType.MONTHLY,
              periodPoint: '16',
            },
            newDonation: {
              expectedTotalAuthTimes: 3,
              expectedAuthedTimes: 1,
            },
            paymentStatus: NewebpayStatus.Success,
            paymentTime: '2022-09-17T14:51:38.829Z',
            nextAuthDate: '2022-10-16',
          }
          const expectResult: Donation = {
            expectedTotalAuthTimes: 3,
            expectedAuthedTimes: 1,
            expectedAuthDates: '2022-09-16,2022-10-16,2022-11-16',
            cronjobCheckDate: '2022-10-15T16:00:00.000Z',
          }

          const result = manager.getPeriodUpdateInput(mockInput)
          expect(result).toMatchObject(expectResult)
        })

        it("expectedTotalAuthTimes dosen't change", () => {
          const mockInput = {
            oldDonation: {
              expectedTotalAuthTimes: 3,
              expectedAuthedTimes: 1,
              expectedAuthDates: '2022-09-16,2022-10-16,2022-11-16',
              periodType: PeriodType.MONTHLY,
              periodPoint: '16',
            },
            newDonation: {
              expectedTotalAuthTimes: 3,
              expectedAuthedTimes: 2,
            },
            paymentStatus: NewebpayStatus.Success,
            paymentTime: '2022-10-17T14:51:38.829Z',
            nextAuthDate: '2022-11-16',
          }
          const expectResult: Donation = {
            expectedAuthedTimes: 2,
            cronjobCheckDate: '2022-11-15T16:00:00.000Z',
          }

          const result = manager.getPeriodUpdateInput(mockInput)
          expect(result).toMatchObject(expectResult)
        })

        it('last monthly installment', () => {
          const mockInput = {
            oldDonation: {
              expectedTotalAuthTimes: 3,
              expectedAuthedTimes: 1,
              expectedAuthDates: '2022-09-16,2022-10-16,2022-11-16',
              periodType: PeriodType.MONTHLY,
              periodPoint: '16',
            },
            newDonation: {
              expectedTotalAuthTimes: 3,
              expectedAuthedTimes: 3,
            },
            paymentStatus: NewebpayStatus.Success,
            paymentTime: '2022-11-17T14:51:38.829Z',
            nextAuthDate: '',
          }
          const expectResult: Donation = {
            expectedAuthedTimes: 3,
            cronjobCheckDate: null,
          }

          const result = manager.getPeriodUpdateInput(mockInput)
          expect(result).toMatchObject(expectResult)
        })

        it('throws error when nextAuthDate is not valid', () => {
          const mockInput = {
            oldDonation: {
              expectedTotalAuthTimes: 3,
              expectedAuthedTimes: 1,
              expectedAuthDates: '2022-09-16,2022-10-16,2022-11-16',
              periodType: PeriodType.MONTHLY,
              periodPoint: '16',
            },
            newDonation: {
              expectedTotalAuthTimes: 3,
              expectedAuthedTimes: 2,
            },
            paymentStatus: NewebpayStatus.Success,
            paymentTime: '2022-10-17T14:51:38.829Z',
            nextAuthDate: '',
          }

          expect(() => manager.getPeriodUpdateInput(mockInput)).toThrowError(
            /is not a valid date string/
          )
        })
      })

      describe('case: result of single payment detail query', () => {
        // newDonation.expectedAuthedTimes, newDonation.paymentTime

        it('first monthly installment', () => {
          const mockInput = {
            oldDonation: {
              expectedTotalAuthTimes: 3,
              expectedAuthedTimes: 1,
              periodType: PeriodType.MONTHLY,
              periodPoint: '16',
            },
            newDonation: {
              expectedAuthedTimes: 1,
            },
            paymentStatus: NewebpayStatus.Success,
            paymentTime: '2022-09-17T14:51:38.829Z',
            nextAuthDate: undefined,
          }
          const expectResult: Donation = {
            expectedAuthedTimes: 1,
            expectedAuthDates: '2022-09-16,2022-10-16,2022-11-16',
            cronjobCheckDate: '2022-10-15T16:00:00.000Z',
          }

          const result = manager.getPeriodUpdateInput(mockInput)
          expect(result).toMatchObject(expectResult)
        })

        it('next monthly installment', () => {
          const mockInput = {
            oldDonation: {
              expectedTotalAuthTimes: 3,
              expectedAuthedTimes: 1,
              expectedAuthDates: '2022-09-17,2022-10-17,2022-11-17',
              periodType: PeriodType.MONTHLY,
              periodPoint: '17',
            },
            newDonation: {
              expectedAuthedTimes: 2,
            },
            paymentStatus: NewebpayStatus.Success,
            paymentTime: '2022-09-18T14:51:38.829Z',
            nextAuthDate: undefined,
          }
          const expectResult: Donation = {
            expectedAuthedTimes: 2,
            expectedAuthDates: '2022-09-17,2022-10-17,2022-11-17',
            cronjobCheckDate: '2022-11-16T16:00:00.000Z',
          }

          const result = manager.getPeriodUpdateInput(mockInput)
          expect(result).toMatchObject(expectResult)
        })

        it('last monthly installment', () => {
          const mockInput = {
            oldDonation: {
              expectedTotalAuthTimes: 3,
              expectedAuthedTimes: 2,
              expectedAuthDates: '2022-09-17,2022-10-17,2022-11-17',
              periodType: PeriodType.MONTHLY,
              periodPoint: '17',
            },
            newDonation: {
              expectedAuthedTimes: 3,
            },
            paymentStatus: NewebpayStatus.Success,
            paymentTime: '2022-11-18T14:51:38.829Z',
            nextAuthDate: undefined,
          }
          const expectResult: Donation = {
            expectedAuthedTimes: 3,
            expectedAuthDates: '2022-09-17,2022-10-17,2022-11-17',
            cronjobCheckDate: null,
          }

          const result = manager.getPeriodUpdateInput(mockInput)
          expect(result).toMatchObject(expectResult)
        })

        it('past monthly installment', () => {
          const mockInput = {
            oldDonation: {
              expectedTotalAuthTimes: 4,
              expectedAuthedTimes: 3,
              expectedAuthDates: '2022-09-17,2022-10-17,2022-11-17,2022-12-17',
              periodType: PeriodType.MONTHLY,
              periodPoint: '17',
            },
            newDonation: {
              expectedAuthedTimes: 2,
            },
            paymentStatus: NewebpayStatus.Success,
            paymentTime: '2022-10-18T14:51:38.829Z',
            nextAuthDate: undefined,
          }
          const expectResult: Donation = {
            expectedAuthedTimes: 3,
            expectedAuthDates: '2022-09-17,2022-10-17,2022-11-17,2022-12-17',
            cronjobCheckDate: '2022-12-16T16:00:00.000Z',
          }

          const result = manager.getPeriodUpdateInput(mockInput)
          expect(result).toMatchObject(expectResult)
        })
      })

      describe('case: other', () => {
        /*
        [
          Success && newAuthedTimes >= 2
          or
          Other newAuthedTimes >= 1
        ]
        and
        [
          typeof newTotalAuthTimes === 'undefined' && nextAuthDate any
          or
          newTotalAuthTimes >= 0 && typeof nextAuthDate !== 'string'
        ]
        and
        [
          typeof newAuthDates !== 'string'
        ]
        and
        [
          newAuthDates is truthy value && nextAuthDate any
          or
          newAuthDates is falsy value && nextAuthDate is truthy
        ]
        */

        const mockInputs = [
          {
            oldDonation: {
              expectedTotalAuthTimes: 3,
              expectedAuthedTimes: 1,
              expectedAuthDates: '',
              periodType: PeriodType.MONTHLY,
              periodPoint: '16',
            },
            newDonation: {
              expectedAuthedTimes: 2,
              expectedAuthDates: null,
            },
            paymentStatus: NewebpayStatus.Success,
            paymentTime: '2022-10-18T14:51:38.829Z',
            nextAuthDate: '2022-11-18T14:51:38.829Z',
          },
          {
            oldDonation: {
              expectedTotalAuthTimes: 3,
              expectedAuthedTimes: 1,
              expectedAuthDates: '',
              periodType: PeriodType.MONTHLY,
              periodPoint: '16',
            },
            newDonation: {
              expectedTotalAuthTimes: 3,
              expectedAuthedTimes: 2,
              expectedAuthDates: null,
            },
            paymentStatus: NewebpayStatus.Success,
            paymentTime: '2022-10-18T14:51:38.829Z',
            nextAuthDate: true,
          },
        ]

        const mockInputList = mockInputs.map((input, index) => ({
          index,
          data: input,
        }))

        // eslint-disable-next-line
        it.each(mockInputList)(`throws error #$index`, ({ index, data }) => {
          // @ts-ignore: next-line
          expect(() => manager.getPeriodUpdateInput(data)).toThrowError(
            /input data doesn't match any condictions/
          )
        })
      })
    })

    describe('test on different period settings', () => {
      it('periodType - D, periodPoint - 2', () => {
        const mockInput = {
          oldDonation: {
            expectedTotalAuthTimes: 3,
            expectedAuthedTimes: 1,
            expectedAuthDates: undefined,
            periodType: PeriodType.DAY,
            periodPoint: '2',
          },
          newDonation: {
            expectedAuthedTimes: 1,
          },
          paymentStatus: NewebpayStatus.Success,
          paymentTime: '2022-09-29T14:51:38.829Z',
          nextAuthDate: undefined,
        }
        const expectResult: Donation = {
          expectedAuthedTimes: 1,
          expectedAuthDates: '2022-09-29,2022-10-01,2022-10-03',
          cronjobCheckDate: '2022-09-30T16:00:00.000Z',
        }

        const result = manager.getPeriodUpdateInput(mockInput)
        expect(result).toMatchObject(expectResult)
      })

      it('periodType - W, periodPoint - 3', () => {
        const mockInput = {
          oldDonation: {
            expectedTotalAuthTimes: 3,
            expectedAuthedTimes: 1,
            expectedAuthDates: undefined,
            periodType: PeriodType.WEEKLY,
            periodPoint: '3',
          },
          newDonation: {
            expectedAuthedTimes: 1,
          },
          paymentStatus: NewebpayStatus.Success,
          paymentTime: '2022-09-29T14:51:38.829Z',
          nextAuthDate: undefined,
        }
        const expectResult: Donation = {
          expectedAuthedTimes: 1,
          expectedAuthDates: '2022-09-28,2022-10-05,2022-10-12',
          cronjobCheckDate: '2022-10-04T16:00:00.000Z',
        }

        const result = manager.getPeriodUpdateInput(mockInput)
        expect(result).toMatchObject(expectResult)
      })

      it('periodType - M, periodPoint - 04', () => {
        const mockInput = {
          oldDonation: {
            expectedTotalAuthTimes: 3,
            expectedAuthedTimes: 1,
            expectedAuthDates: undefined,
            periodType: PeriodType.MONTHLY,
            periodPoint: '04',
          },
          newDonation: {
            expectedAuthedTimes: 1,
          },
          paymentStatus: NewebpayStatus.Success,
          paymentTime: '2022-09-05T14:51:38.829Z',
          nextAuthDate: undefined,
        }
        const expectResult: Donation = {
          expectedAuthedTimes: 1,
          expectedAuthDates: '2022-09-04,2022-10-04,2022-11-04',
          cronjobCheckDate: '2022-10-03T16:00:00.000Z',
        }

        const result = manager.getPeriodUpdateInput(mockInput)
        expect(result).toMatchObject(expectResult)
      })

      it('periodType - M, periodPoint - 31', () => {
        const mockInput = {
          oldDonation: {
            expectedTotalAuthTimes: 3,
            expectedAuthedTimes: 1,
            expectedAuthDates: undefined,
            periodType: PeriodType.MONTHLY,
            periodPoint: '31',
          },
          newDonation: {
            expectedAuthedTimes: 1,
          },
          paymentStatus: NewebpayStatus.Success,
          paymentTime: '2022-02-01T14:51:38.829Z',
          nextAuthDate: undefined,
        }
        const expectResult: Donation = {
          expectedAuthedTimes: 1,
          expectedAuthDates: '2022-01-31,2022-02-28,2022-03-31',
          cronjobCheckDate: '2022-02-27T16:00:00.000Z',
        }

        const result = manager.getPeriodUpdateInput(mockInput)
        expect(result).toMatchObject(expectResult)
      })

      it('periodType - Y, periodPoint - 0925', () => {
        const mockInput = {
          oldDonation: {
            expectedTotalAuthTimes: 3,
            expectedAuthedTimes: 1,
            expectedAuthDates: undefined,
            periodType: PeriodType.YEARLY,
            periodPoint: '0925',
          },
          newDonation: {
            expectedAuthedTimes: 1,
          },
          paymentStatus: NewebpayStatus.Success,
          paymentTime: '2022-09-26T14:51:38.829Z',
          nextAuthDate: undefined,
        }
        const expectResult: Donation = {
          expectedAuthedTimes: 1,
          expectedAuthDates: '2022-09-25,2023-09-25,2024-09-25',
          cronjobCheckDate: '2023-09-24T16:00:00.000Z',
        }

        const result = manager.getPeriodUpdateInput(mockInput)
        expect(result).toMatchObject(expectResult)
      })

      it('periodType - Y, periodPoint - 0229', () => {
        const mockInput = {
          oldDonation: {
            expectedTotalAuthTimes: 3,
            expectedAuthedTimes: 1,
            expectedAuthDates: undefined,
            periodType: PeriodType.YEARLY,
            periodPoint: '0229',
          },
          newDonation: {
            expectedAuthedTimes: 1,
          },
          paymentStatus: NewebpayStatus.Success,
          paymentTime: '2020-03-01T14:51:38.829Z',
          nextAuthDate: undefined,
        }
        const expectResult: Donation = {
          expectedAuthedTimes: 1,
          expectedAuthDates: '2020-02-29,2021-02-28,2022-02-28',
          cronjobCheckDate: '2021-02-27T16:00:00.000Z',
        }

        const result = manager.getPeriodUpdateInput(mockInput)
        expect(result).toMatchObject(expectResult)
      })
    })
  })
})
