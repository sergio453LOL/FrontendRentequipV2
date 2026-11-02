import type { Payment, PaymentRequest } from '../types'
import { api } from './api'
import { ENDPOINTS } from './endpoints'

/** The backend makes several calls to Stripe per checkout, so the default 15 s timeout is too tight. */
const PAYMENT_TIMEOUT_MS = 45_000

export const paymentService = {
  /** Captures the rental and holds the security deposit. Resolves with both payment records. */
  async pay(reservationId: number, paymentToken: string): Promise<Payment[]> {
    const body: PaymentRequest = { paymentToken }
    const { data } = await api.post<Payment[]>(ENDPOINTS.reservationPayments(reservationId), body, {
      timeout: PAYMENT_TIMEOUT_MS,
    })
    return data
  },

  async list(reservationId: number): Promise<Payment[]> {
    const { data } = await api.get<Payment[]>(ENDPOINTS.reservationPayments(reservationId))
    return data
  },
}
