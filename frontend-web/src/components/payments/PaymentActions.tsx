import { Lock, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Reservation } from '../../types'
import { formatCurrency } from '../../utils/format'
import { Button } from '../common/Button'

interface PaymentActionsProps {
  reservation: Reservation
  isProcessing: boolean
  securityNote: string
  onSkip?: () => void
}

/** Security note plus the submit button (and "Pagar después" in the booking flow). */
export function PaymentActions({ reservation, isProcessing, securityNote, onSkip }: PaymentActionsProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <ShieldCheck className="size-4 text-slate-500" aria-hidden="true" />
        {securityNote}
      </p>
      <div className="flex gap-2">
        {onSkip && (
          <Button variant="ghost" onClick={onSkip} disabled={isProcessing}>
            {t('payment.payLater')}
          </Button>
        )}
        <Button type="submit" variant="action" isLoading={isProcessing} leftIcon={<Lock className="size-4" />}>
          {t('payment.payAmount', { amount: formatCurrency(reservation.totalAmount, reservation.currency) })}
        </Button>
      </div>
    </div>
  )
}
