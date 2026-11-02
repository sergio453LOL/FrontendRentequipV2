import { currentLocale } from '../i18n'
import type { IsoDate } from '../types'

const MS_PER_DAY = 86_400_000

export function formatCurrency(amount: number, currency = 'PEN'): string {
  // English has no symbol for soles (it prints "PEN 35.00"): keep the S/ every Peruvian invoice uses.
  return new Intl.NumberFormat(currentLocale(), { style: 'currency', currency, maximumFractionDigits: 2 })
    .format(amount)
    .replace('PEN', 'S/')
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(currentLocale()).format(value)
}

/** Parses `YYYY-MM-DD` as a local calendar date, avoiding the UTC shift of `new Date(isoString)`. */
export function parseIsoDate(date: IsoDate): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDate(date: IsoDate, locale: string = currentLocale()): string {
  return parseIsoDate(date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
}

export function toIsoDate(date: Date): IsoDate {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function todayIso(): IsoDate {
  return toIsoDate(new Date())
}

/** Rental days between two dates, both included, matching how the backend bills a reservation. */
export function rentalDays(start: IsoDate, end: IsoDate): number {
  return Math.round((parseIsoDate(end).getTime() - parseIsoDate(start).getTime()) / MS_PER_DAY) + 1
}

/** Human-friendly reservation code printed on receipts, e.g. RE-000123. */
export function reservationCode(reservationId: number): string {
  return `RE-${String(reservationId).padStart(6, '0')}`
}

/**
 * Compact range for lists: "9–13 nov." in one month, "27 oct. – 2 nov." across two. Other languages use
 * their own range format ("Nov 9 – 13", "11月9日至13日").
 */
export function formatDateRange(start: IsoDate, end: IsoDate): string {
  const from = parseIsoDate(start)
  const to = parseIsoDate(end)
  const locale = currentLocale()
  if (!locale.startsWith('es')) {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).formatRange(from, to)
  }
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()
  const month = (date: Date) => date.toLocaleDateString(locale, { month: 'short' }).toLowerCase()
  if (sameMonth) {
    return `${from.getDate()}–${to.getDate()} ${month(to)}`
  }
  return `${from.getDate()} ${month(from)} – ${to.getDate()} ${month(to)}`
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Whole days from `from` to `to` (both local midnights). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY)
}
