import type { IsoDate } from '../../types'

/** Rental dates picked on the calendar: the start alone while the user still has to tap the end. */
export interface DateSelection {
  startDate: IsoDate | null
  endDate: IsoDate | null
}

export const EMPTY_SELECTION: DateSelection = { startDate: null, endDate: null }
