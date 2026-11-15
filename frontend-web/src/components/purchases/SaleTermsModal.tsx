import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFetch } from '../../hooks/useFetch'
import { useMutation } from '../../hooks/useMutation'
import { ENDPOINTS } from '../../services/endpoints'
import { purchaseService } from '../../services/purchaseService'
import type { Equipment, EquipmentSaleRequest, EquipmentSummary } from '../../types'
import { formatCurrency } from '../../utils/format'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { Modal } from '../common/Modal'
import { Select } from '../common/Select'

const CREDIT_OPTIONS = [0, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100]

/** The example rental the preview prices: a week, the most common booking length. */
const EXAMPLE_DAYS = 7

interface SaleTermsModalProps {
  machine: EquipmentSummary
  onClose: () => void
  onSaved: () => void
}

/**
 * The owner offers a machine for sale to whoever rents it: a price, and the share of the rent already
 * paid that comes off it. A worked example shows what a renter of one week would pay.
 */
export function SaleTermsModal({ machine, onClose, onSaved }: SaleTermsModalProps) {
  const { t } = useTranslation()
  const detail = useFetch<Equipment>(ENDPOINTS.equipment(machine.id))
  const [price, setPrice] = useState<string | null>(null)
  const [credit, setCredit] = useState<number | null>(null)

  const currentPrice = detail.data?.salePrice ?? machine.salePrice
  const priceText = price ?? (currentPrice !== null ? String(currentPrice) : '')
  // A machine already for sale keeps its credit; one being listed starts at half the rent.
  const creditPercent = credit ?? (currentPrice !== null && detail.data ? detail.data.rentCreditPercent : 50)
  const numericPrice = Number(priceText.replace(',', '.'))
  const priceIsValid = priceText.trim() !== '' && Number.isFinite(numericPrice) && numericPrice > 0 && /^\d+([.,]\d{1,2})?$/.test(priceText.trim())

  const exampleRent = machine.dailyRate * EXAMPLE_DAYS
  const exampleCredit = priceIsValid ? Math.min(Math.round(exampleRent * creditPercent) / 100, numericPrice) : 0
  const money = (amount: number) => formatCurrency(amount, machine.currency)

  const save = useMutation((request: EquipmentSaleRequest) => purchaseService.updateSaleTerms(machine.id, request), {
    successMessage: (saved) => (saved.salePrice === null ? t('sale.removed') : t('sale.saved')),
    errorTitle: t('sale.saveFailed'),
    onSuccess: () => {
      onSaved()
      onClose()
    },
  })

  return (
    <Modal
      isOpen
      title={t('sale.title', { name: machine.name })}
      onClose={onClose}
      isDismissable={!save.isLoading}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {currentPrice !== null ? (
            <Button variant="ghost" onClick={() => void save.mutate({ salePrice: null, rentCreditPercent: 0 })} disabled={save.isLoading}>
              {t('sale.remove')}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={save.isLoading}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              disabled={!priceIsValid}
              isLoading={save.isLoading}
              onClick={() => void save.mutate({ salePrice: numericPrice, rentCreditPercent: creditPercent })}
            >
              {currentPrice !== null ? t('sale.update') : t('sale.publish')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-sm leading-6 text-slate-600">{t('sale.intro')}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('sale.price', { currency: machine.currency })}
            inputMode="decimal"
            required
            placeholder="85000"
            value={priceText}
            onChange={(event) => setPrice(event.target.value)}
            error={priceText.trim() !== '' && !priceIsValid ? t('validation.money') : undefined}
          />
          <Select
            label={t('sale.credit')}
            value={String(creditPercent)}
            onChange={(event) => setCredit(Number(event.target.value))}
            options={CREDIT_OPTIONS.map((value) => ({ value: String(value), label: t('sale.creditOption', { value }) }))}
            hint={t('sale.creditHint')}
          />
        </div>

        <figure className="rounded-lg bg-raised p-4 text-sm">
          <figcaption className="mb-2 font-medium text-ink">{t('sale.example', { days: EXAMPLE_DAYS })}</figcaption>
          <dl className="space-y-1.5">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">{t('sale.exampleRent', { days: EXAMPLE_DAYS, rate: money(machine.dailyRate) })}</dt>
              <dd className="num text-ink">{money(exampleRent)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">{t('purchase.listPrice')}</dt>
              <dd className="num text-ink">{priceIsValid ? money(numericPrice) : '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">{t('purchase.credit', { percent: creditPercent })}</dt>
              <dd className="num text-positive">{priceIsValid ? `− ${money(exampleCredit)}` : '—'}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-slate-200 pt-1.5 font-semibold">
              <dt className="text-ink">{t('purchase.finalPrice')}</dt>
              <dd className="num text-ink">{priceIsValid ? money(numericPrice - exampleCredit) : '—'}</dd>
            </div>
          </dl>
        </figure>
      </div>
    </Modal>
  )
}
