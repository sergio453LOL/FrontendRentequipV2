import { currentLocale } from '../i18n'

/** Whole soles with the S/ every Peruvian invoice uses: "S/ 184,500". */
export function formatSoles(amount: number): string {
  return `S/ ${new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: 0 }).format(Math.round(amount))}`
}

/** Soles with cents, for commissions and settlements: "S/ 1,240.50". */
export function formatSolesExact(amount: number): string {
  return `S/ ${new Intl.NumberFormat(currentLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`
}

/** "S/ 184.5 mil" style for chart ticks and tight cells. */
export function formatSolesCompact(amount: number): string {
  return `S/ ${new Intl.NumberFormat(currentLocale(), { notation: 'compact', maximumFractionDigits: 1 }).format(amount)}`
}

export function formatPercent(value: number, digits = 1): string {
  return `${new Intl.NumberFormat(currentLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)}%`
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat(currentLocale()).format(value)
}

/** Relative change in percent, signed: +18.0%, −4.2%. Null when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

/** A sign on every change, a real minus for negatives. */
export function signed(text: string, value: number): string {
  if (value > 0) return `+${text}`
  if (value < 0) return `−${text.replace('-', '')}`
  return text
}

/** "26 nov., 14:32" in the active language. */
export function formatDateTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleString(currentLocale(), { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

export function formatTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

/** Builds a CSV (comma separated, quoted, with a BOM so Excel reads the accents) and downloads it. */
export function downloadCsv(fileName: string, header: string[], rows: (string | number | null)[][]): void {
  const quote = (value: string | number | null) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const text = [header, ...rows].map((row) => row.map(quote).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([`﻿${text}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
