import type { ReservationStatus } from '../types'

/** Every reservation status, in the order the filters show them. Their names live in i18n `status.reservation`. */
export const RESERVATION_STATUSES: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED']
