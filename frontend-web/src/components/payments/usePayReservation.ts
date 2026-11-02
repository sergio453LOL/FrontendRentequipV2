import { useTranslation } from 'react-i18next'
import { useMutation } from '../../hooks/useMutation'
import { paymentService } from '../../services/paymentService'
import type { Payment, Reservation } from '../../types'

/** Sends the card token to the backend, which captures the rental and holds the deposit. */
export function usePayReservation(reservation: Reservation, onPaid: (payments: Payment[]) => void) {
  const { t } = useTranslation()
  return useMutation((paymentToken: string) => paymentService.pay(reservation.id, paymentToken), {
    successMessage: t('payment.success'),
    errorTitle: t('payment.failed'),
    onSuccess: onPaid,
  })
}
