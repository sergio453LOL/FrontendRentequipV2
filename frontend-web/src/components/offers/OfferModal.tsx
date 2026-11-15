import { HandCoins } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useMutation } from '../../hooks/useMutation'
import { offerService } from '../../services/offerService'
import type { Equipment } from '../../types'
import { formatCurrency } from '../../utils/format'
import type { DateSelection } from '../equipment/dateSelection'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { Modal } from '../common/Modal'
import { Textarea } from '../common/Textarea'

const MONEY = /^\d{1,8}(\.\d{1,2})?$/

interface OfferModalProps {
  equipment: Equipment
  isOpen: boolean
  onClose: () => void
  /** Dates picked on the calendar travel with the offer, so the owner knows the term. */
  dates: DateSelection
}

/** The renter's counteroffer: a lower daily rate and, optionally, the conditions behind it. */
export function OfferModal({ equipment, isOpen, onClose, dates }: OfferModalProps) {
  const { t } = useTranslation()
  const [rate, setRate] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const send = useMutation(offerService.create, {
    errorTitle: t('offers.sendFailed'),
    onSuccess: () => setSent(true),
  })

  const value = Number(rate)
  const discount = MONEY.test(rate) && value > 0 && value < equipment.dailyRate ? Math.round((1 - value / equipment.dailyRate) * 100) : null

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!MONEY.test(rate) || value <= 0) {
      setError(t('offers.rateInvalid'))
      return
    }
    if (value >= equipment.dailyRate) {
      setError(t('offers.rateTooHigh', { price: formatCurrency(equipment.dailyRate, equipment.currency) }))
      return
    }
    setError(null)
    await send.mutate({
      equipmentId: equipment.id,
      dailyRate: value,
      startDate: dates.startDate ?? undefined,
      endDate: dates.endDate ?? undefined,
      message: message.trim() || undefined,
    })
  }

  function close() {
    setRate('')
    setMessage('')
    setError(null)
    setSent(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title={t('offers.modalTitle')} size="sm" isDismissable={!send.isLoading}>
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-ink">{t('offers.sentText', { company: equipment.ownerCompanyName })}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              {t('common.close')}
            </Button>
            <Link
              to="/offers?role=RENTER"
              onClick={close}
              className="inline-flex h-10 items-center rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-hover"
            >
              {t('offers.viewMine')}
            </Link>
          </div>
        </div>
      ) : (
        <form noValidate onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm leading-6 text-slate-700">
            {t('offers.modalText', { price: formatCurrency(equipment.dailyRate, equipment.currency) })}
          </p>
          <Input
            label={t('offers.yourRate')}
            inputMode="decimal"
            required
            autoFocus
            placeholder={String(Math.round(equipment.dailyRate * 0.85))}
            value={rate}
            onChange={(event) => setRate(event.target.value.replace(',', '.'))}
            error={error ?? undefined}
            hint={discount !== null ? t('offers.discount', { percent: discount }) : undefined}
            leftIcon={<HandCoins className="size-4" />}
          />
          <Textarea
            label={t('offers.conditions')}
            rows={3}
            maxLength={500}
            placeholder={t('offers.conditionsPlaceholder')}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close} disabled={send.isLoading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" isLoading={send.isLoading}>
              {t('offers.send')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
