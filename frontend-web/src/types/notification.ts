import type { IsoDateTime } from './common'

export type NotificationType =
  | 'RESERVATION_REQUESTED'
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_REJECTED'
  | 'RESERVATION_CANCELLED'
  | 'RESERVATION_STARTED'
  | 'RESERVATION_COMPLETED'
  | 'OFFER_RECEIVED'
  | 'OFFER_ACCEPTED'
  | 'OFFER_REJECTED'
  | 'OFFER_COUNTERED'

/** An alert in the company's inbox (named so it does not clash with the browser's Notification). */
export interface AppNotification {
  id: number
  type: NotificationType
  title: string
  message: string
  /** App path that opens the related screen. */
  link: string | null
  read: boolean
  createdAt: IsoDateTime
}
