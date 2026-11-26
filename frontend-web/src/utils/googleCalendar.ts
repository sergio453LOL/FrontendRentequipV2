import type { Reservation } from '../types'

const GOOGLE_TEMPLATE = 'https://calendar.google.com/calendar/render?action=TEMPLATE'

/** 2026-10-15 becomes 20261015, the all-day date format Google Calendar expects. */
const compact = (isoDate: string) => isoDate.slice(0, 10).replace(/-/g, '')

/** The day after `isoDate`: Google takes the end of an all-day event as exclusive. */
function nextDay(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + 1))
  return date.toISOString().slice(0, 10)
}

/**
 * Opens Google Calendar with the rental filled in as an all-day event covering every rented day, so the
 * renter only has to press Save. Same event the confirmation email sends as an invitation.
 */
export function googleCalendarUrl(reservation: Reservation, text: { title: string; details: string }): string {
  const params = new URLSearchParams({
    text: text.title,
    dates: `${compact(reservation.startDate)}/${compact(nextDay(reservation.endDate))}`,
    details: text.details,
    ctz: 'America/Lima',
  })
  return `${GOOGLE_TEMPLATE}&${params.toString()}`
}
