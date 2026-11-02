import { useTranslation } from 'react-i18next'
import type { Reservation } from '../../types'
import { formatCurrency } from '../../utils/format'

/** Breakdown of what the checkout charges now and what it only holds on the card. */
export function PaymentSummary({ reservation }: { reservation: Reservation }) {
  const { t } = useTranslation()
  const money = (amount: number) => formatCurrency(amount, reservation.currency)

  return (
    <dl className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
      <div className="flex justify-between">
        <dt className="text-slate-600">{t('payment.rentalNow')}</dt>
        <dd className="font-semibold text-slate-900">{money(reservation.rentalAmount)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-slate-600">{t('payment.depositHeld')}</dt>
        <dd className="font-semibold text-slate-900">{money(reservation.securityDeposit)}</dd>
      </div>
      <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
        <dt className="font-semibold text-slate-900">{t('payment.total')}</dt>
        <dd className="font-semibold text-slate-900">{money(reservation.totalAmount)}</dd>
      </div>
    </dl>
  )
}
