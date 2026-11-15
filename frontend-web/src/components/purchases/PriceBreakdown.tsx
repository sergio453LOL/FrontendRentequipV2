import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../../utils/format'

interface PriceBreakdownProps {
  listPrice: number
  rentCredit: number
  finalPrice: number
  currency: string
  /** Shown when known (the quote); a saved request keeps only the amounts. */
  rentCreditPercent?: number
  rentPaid?: number
}

/** List price, the rent credited and what is left to pay, figures right-aligned so they read as a sum. */
export function PriceBreakdown({ listPrice, rentCredit, finalPrice, currency, rentCreditPercent, rentPaid }: PriceBreakdownProps) {
  const { t } = useTranslation()
  const money = (amount: number) => formatCurrency(amount, currency)
  return (
    <dl className="space-y-2 rounded-lg bg-raised p-4 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-slate-600">{t('purchase.listPrice')}</dt>
        <dd className="num text-ink">{money(listPrice)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-slate-600">
          {rentCreditPercent !== undefined ? t('purchase.credit', { percent: rentCreditPercent }) : t('purchase.creditShort')}
          {rentPaid !== undefined && (
            <span className="block text-xs text-slate-500">{t('purchase.rentPaid', { amount: money(rentPaid) })}</span>
          )}
        </dt>
        <dd className={rentCredit > 0 ? 'num text-positive' : 'num text-slate-500'}>{rentCredit > 0 ? `− ${money(rentCredit)}` : money(0)}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4 border-t border-slate-200 pt-2">
        <dt className="font-semibold text-ink">{t('purchase.finalPrice')}</dt>
        <dd className="num text-xl font-bold text-ink">{money(finalPrice)}</dd>
      </div>
    </dl>
  )
}
