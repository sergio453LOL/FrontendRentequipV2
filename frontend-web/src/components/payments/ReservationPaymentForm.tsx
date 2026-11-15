import type { Payment, Reservation } from '../../types'
import { PaymentForm } from './PaymentForm'
import { PaymentSummary } from './PaymentSummary'
import { usePayReservation } from './usePayReservation'

interface ReservationPaymentFormProps {
  reservation: Reservation
  onPaid: (payments: Payment[]) => void
  /** Optional secondary action, e.g. "Pagar después" in the booking flow. */
  onSkip?: () => void
}

/** The card checkout for a reservation: the rent is captured and the deposit held. */
export function ReservationPaymentForm({ reservation, onPaid, onSkip }: ReservationPaymentFormProps) {
  const payment = usePayReservation(reservation, onPaid)
  return (
    <PaymentForm
      onSkip={onSkip}
      checkout={{
        summary: <PaymentSummary reservation={reservation} />,
        amount: reservation.totalAmount,
        currency: reservation.currency,
        pay: payment.mutate,
        isPaying: payment.isLoading,
      }}
    />
  )
}
