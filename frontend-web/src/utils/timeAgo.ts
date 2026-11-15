import { currentLocale } from '../i18n'

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
]

/** "hace 5 minutos", "ayer", "hace 2 semanas": the age of an alert in the active language. */
export function timeAgo(isoDateTime: string, now: Date = new Date()): string {
  const seconds = Math.round((new Date(isoDateTime).getTime() - now.getTime()) / 1000)
  const format = new Intl.RelativeTimeFormat(currentLocale(), { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit)
  }
  return format.format(0, 'second')
}
