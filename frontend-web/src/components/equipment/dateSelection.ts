import type { BlockedWindow, IsoDate } from '../../types'
import { addDays, parseIsoDate, toIsoDate } from '../../utils/format'

/** Rental dates picked on the calendar: the start alone while the user still has to tap the end. */
export interface DateSelection {
  startDate: IsoDate | null
  endDate: IsoDate | null
}

export const EMPTY_SELECTION: DateSelection = { startDate: null, endDate: null }

/** Whether any booked or pending window overlaps the range (both ends included). */
export function crossesBlockedDays(start: IsoDate, end: IsoDate, windows: BlockedWindow[]): boolean {
  return windows.some((window) => window.startDate <= end && window.endDate >= start)
}

/** Last day of a rental of `days` days that starts on `start` (both ends billed, as the backend does). */
export function rangeEnd(start: IsoDate, days: number): IsoDate {
  return toIsoDate(addDays(parseIsoDate(start), Math.max(1, days) - 1))
}

const SEARCH_DAYS = 120

/**
 * The first `days`-long stretch with no booked or pending day, starting on `from` or later. Null when
 * nothing fits in the next four months.
 */
export function firstFreeRange(days: number, windows: BlockedWindow[], from: IsoDate): { startDate: IsoDate; endDate: IsoDate } | null {
  let start = parseIsoDate(from)
  for (let step = 0; step < SEARCH_DAYS; step++) {
    const startDate = toIsoDate(start)
    const endDate = rangeEnd(startDate, days)
    if (!crossesBlockedDays(startDate, endDate, windows)) return { startDate, endDate }
    start = addDays(start, 1)
  }
  return null
}
