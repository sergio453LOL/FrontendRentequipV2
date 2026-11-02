import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useFetch } from '../../hooks/useFetch'
import { currentLocale } from '../../i18n'
import { ENDPOINTS } from '../../services/endpoints'
import type { BlockedWindow, IsoDate } from '../../types'
import { cn } from '../../utils/cn'
import { addDays, formatDateRange, parseIsoDate, rentalDays, toIsoDate, todayIso } from '../../utils/format'
import { EMPTY_SELECTION, type DateSelection } from './dateSelection'

const MONTHS_SHOWN = 2

type DayState = 'past' | 'free' | 'booked' | 'pending'

const DAY_CLASSES: Record<DayState, string> = {
  past: 'text-slate-300',
  free: 'text-ink hover:bg-slate-100',
  booked: 'bg-red-50 text-red-800 line-through decoration-red-300',
  pending: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-300',
}

/** Monday-first weeks of one month, padded with nulls so the first day lands under its weekday. */
function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = (first.getDay() + 6) % 7
  return [...Array<null>(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, day) => new Date(year, month, day + 1))]
}

/** "Noviembre de 2026": only the first letter in capitals. */
function monthTitle(month: Date): string {
  const label = month.toLocaleDateString(currentLocale(), { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function stateOf(day: Date, today: Date, windows: BlockedWindow[]): DayState {
  if (day < today) return 'past'
  const iso = toIsoDate(day)
  const window = windows.find((item) => item.startDate <= iso && iso <= item.endDate)
  if (!window) return 'free'
  return window.status === 'PENDING' ? 'pending' : 'booked'
}

/** A range cannot jump over days that are booked or waiting for the owner. */
function crossesBlockedDays(start: IsoDate, end: IsoDate, windows: BlockedWindow[]): boolean {
  return windows.some((window) => window.startDate <= end && window.endDate >= start)
}

function dayLabel(day: Date): string {
  return day.toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' })
}

/** "3 nov" */
function shortDate(iso: IsoDate): string {
  return parseIsoDate(iso).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' }).replace('.', '')
}

interface AvailabilityCalendarProps {
  equipmentId: number
  /** With these two props the free days become buttons: first tap picks the start, the second the end. */
  selection?: DateSelection
  onSelectionChange?: (selection: DateSelection) => void
}

/**
 * This month and the next for one machine: occupied days struck through in red, days held by a request
 * still waiting for the owner in amber, the rest free. Built from the blocked-dates feed, which never
 * says who rented the machine. When selectable, the renter taps the rental dates here instead of typing them.
 */
export function AvailabilityCalendar({ equipmentId, selection, onSelectionChange }: AvailabilityCalendarProps) {
  const { t } = useTranslation()
  const [notice, setNotice] = useState<string | null>(null)
  const today = parseIsoDate(todayIso())
  const from = new Date(today.getFullYear(), today.getMonth(), 1)
  const until = addDays(new Date(today.getFullYear(), today.getMonth() + MONTHS_SHOWN, 1), -1)
  const { data, error, refetch } = useFetch<BlockedWindow[]>(ENDPOINTS.equipmentBlockedDates(equipmentId), {
    from: toIsoDate(from),
    until: toIsoDate(until),
  })
  const windows = data ?? []
  const months = Array.from({ length: MONTHS_SHOWN }, (_, index) => new Date(today.getFullYear(), today.getMonth() + index, 1))
  const isSelectable = selection !== undefined && onSelectionChange !== undefined && data !== null
  const { startDate, endDate } = selection ?? EMPTY_SELECTION

  function pick(iso: IsoDate) {
    if (!onSelectionChange) return
    setNotice(null)
    if (!startDate || endDate || iso < startDate) {
      onSelectionChange({ startDate: iso, endDate: null })
      return
    }
    if (crossesBlockedDays(startDate, iso, windows)) {
      setNotice(t('calendar.rangeCrossesBlocked'))
      onSelectionChange({ startDate: iso, endDate: null })
      return
    }
    onSelectionChange({ startDate, endDate: iso })
  }

  function clear() {
    setNotice(null)
    onSelectionChange?.(EMPTY_SELECTION)
  }

  return (
    <section aria-labelledby="availability-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="availability-title" className="text-lg font-bold text-ink">
          {t('calendar.title')}
        </h2>
        <ul className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600" aria-label={t('calendar.legend')}>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border border-slate-200 bg-white" aria-hidden="true" /> {t('calendar.free')}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-amber-50 ring-1 ring-amber-300 ring-inset" aria-hidden="true" /> {t('calendar.pending')}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-red-50 ring-1 ring-red-200 ring-inset" aria-hidden="true" /> {t('calendar.booked')}
          </li>
          {isSelectable && (
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-brand" aria-hidden="true" /> {t('calendar.yourDates')}
            </li>
          )}
        </ul>
      </div>

      {error ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600">
          {t('calendar.loadError')}{' '}
          <button type="button" onClick={refetch} className="font-semibold text-ink underline">
            {t('common.retry')}
          </button>
        </p>
      ) : (
        <div className={cn('grid gap-4 sm:grid-cols-2', !data && 'opacity-60')} aria-busy={!data}>
          {months.map((month) => (
            <div key={month.getMonth()} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-sm font-bold text-ink">
                {monthTitle(month)}
              </p>
              <div className="grid grid-cols-7 gap-1 text-center" aria-hidden={isSelectable ? undefined : true}>
                {t('calendar.weekdays', { returnObjects: true }).map((weekday, index) => (
                  <span key={index} className="pb-1 text-xs font-semibold text-slate-500" aria-hidden="true">
                    {weekday}
                  </span>
                ))}
                {monthGrid(month.getFullYear(), month.getMonth()).map((day, index) => {
                  if (!day) return <span key={`pad-${index}`} />
                  const state = stateOf(day, today, windows)
                  const iso = toIsoDate(day)
                  const isToday = day.getTime() === today.getTime()
                  const isEdge = iso === startDate || iso === endDate
                  const isInside = startDate !== null && endDate !== null && iso > startDate && iso < endDate
                  const className = cn(
                    'num flex h-8 items-center justify-center rounded-md text-sm font-medium transition-colors',
                    DAY_CLASSES[state],
                    isToday && 'font-bold ring-2 ring-brand ring-inset',
                    isInside && 'bg-accent-tint text-ink hover:bg-accent-tint',
                    isEdge && 'bg-brand font-bold text-on-brand hover:bg-brand',
                  )

                  if (isSelectable && state === 'free') {
                    return (
                      <button
                        key={day.getDate()}
                        type="button"
                        onClick={() => pick(iso)}
                        aria-pressed={isEdge || isInside}
                        aria-label={t('calendar.dayFree', { day: dayLabel(day) })}
                        className={cn(className, 'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand')}
                      >
                        {day.getDate()}
                      </button>
                    )
                  }
                  return (
                    <span key={day.getDate()} className={className} aria-hidden={isSelectable ? true : undefined}>
                      {day.getDate()}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
          {/* The grid is visual; screen readers get the busy periods as a sentence. */}
          <p className="sr-only">
            {windows.length === 0
              ? t('calendar.allFree')
              : windows
                  .map((item) => `${item.status === 'PENDING' ? t('calendar.pending') : t('calendar.booked')}: ${formatDateRange(item.startDate, item.endDate)}`)
                  .join('; ')}
          </p>
        </div>
      )}

      {isSelectable && (
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-2 text-sm" aria-live="polite">
          <p className={cn(notice ? 'text-amber-800' : 'text-slate-600')}>
            {notice ??
              (startDate && endDate ? (
                <Trans
                  i18nKey="calendar.datesSummary"
                  values={{ range: formatDateRange(startDate, endDate), days: t('common.day', { count: rentalDays(startDate, endDate) }) }}
                  components={{ b: <span className="font-semibold text-ink" /> }}
                />
              ) : startDate ? (
                <Trans
                  i18nKey="calendar.startPicked"
                  values={{ date: shortDate(startDate) }}
                  components={{ b: <span className="font-semibold text-ink" /> }}
                />
              ) : (
                t('calendar.pickHint')
              ))}
          </p>
          {startDate && (
            <button type="button" onClick={clear} className="text-sm font-semibold text-ink underline underline-offset-2">
              {t('calendar.clear')}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
