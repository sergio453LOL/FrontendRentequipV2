import type {
  ReceiptChannel,
  ReceiptDelivery,
  Reservation,
  ReservationCreateRequest,
  ReservationStatus,
  ReservationStatusUpdateRequest,
  WithLinks,
} from '../types'
import { api } from './api'
import { ENDPOINTS } from './endpoints'

export const reservationService = {
  /** Re-sends the receipt of a paid reservation to the user's registered email or WhatsApp. */
  async sendReceipt(reservationId: number, channel: ReceiptChannel): Promise<ReceiptDelivery> {
    const { data } = await api.post<ReceiptDelivery>(ENDPOINTS.reservationReceiptDeliveries(reservationId), { channel })
    return data
  },

  async create(request: ReservationCreateRequest): Promise<WithLinks<Reservation>> {
    const { data } = await api.post<WithLinks<Reservation>>(ENDPOINTS.reservations, request)
    return data
  },

  async confirm(id: number): Promise<WithLinks<Reservation>> {
    const { data } = await api.post<WithLinks<Reservation>>(ENDPOINTS.reservationConfirmation(id))
    return data
  },

  async cancel(id: number, reason?: string): Promise<WithLinks<Reservation>> {
    const { data } = await api.post<WithLinks<Reservation>>(ENDPOINTS.reservationCancellation(id), null, {
      params: { reason: reason || undefined },
    })
    return data
  },

  async updateStatus(id: number, status: ReservationStatus, reason?: string): Promise<WithLinks<Reservation>> {
    const body: ReservationStatusUpdateRequest = { status, reason: reason || undefined }
    const { data } = await api.patch<WithLinks<Reservation>>(ENDPOINTS.reservationStatus(id), body)
    return data
  },
}
