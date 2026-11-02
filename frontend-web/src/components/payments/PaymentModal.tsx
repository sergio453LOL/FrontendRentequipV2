import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Payment, Reservation } from '../../types'
import { Modal } from '../common/Modal'
import { PaymentForm } from './PaymentForm'
import { PaymentSuccess } from './PaymentSuccess'

interface PaymentModalProps {
  reservation: Reservation
  onClose: () => void
  onPaid: () => void
}

/** Pays a reservation that was booked earlier and left unpaid. */
export function PaymentModal({ reservation, onClose, onPaid }: PaymentModalProps) {
  const { t } = useTranslation()
  const [payments, setPayments] = useState<Payment[] | null>(null)

  function handlePaid(result: Payment[]) {
    setPayments(result)
    onPaid()
  }

  return (
    <Modal isOpen title={payments ? t('payment.completed') : t('payment.payReservation', { name: reservation.equipmentName })} onClose={onClose}>
      {payments ? (
        <PaymentSuccess reservation={{ ...reservation, paymentStatus: 'PAID' }} payments={payments} onDone={onClose} />
      ) : (
        <PaymentForm reservation={reservation} onPaid={handlePaid} />
      )}
    </Modal>
  )
}
