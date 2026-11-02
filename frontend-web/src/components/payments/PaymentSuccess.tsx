import { motion } from 'framer-motion'
import { CheckCircle2, FileDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../hooks/useToast'
import type { Payment, Reservation } from '../../types'
import { celebrate } from '../../utils/celebrate'
import { downloadReceipt } from '../../utils/downloadReceipt'
import { formatCurrency } from '../../utils/format'
import { Button } from '../common/Button'
import { ReceiptShareButtons } from '../receipts/ReceiptShareButtons'

interface PaymentSuccessProps {
  reservation: Reservation
  payments: Payment[]
  onDone: () => void
  doneLabel?: string
}

export function PaymentSuccess({ reservation, payments, onDone, doneLabel }: PaymentSuccessProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => celebrate(), [])

  async function handleDownload() {
    setIsGenerating(true)
    try {
      await downloadReceipt(reservation, payments)
    } catch {
      toast.error(t('reservations.receiptFailed'), t('reservations.receiptRetry'))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <motion.span
        initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 16 }}
        className="flex size-16 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60"
      >
        <CheckCircle2 className="size-10 text-status-green" aria-hidden="true" />
      </motion.span>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-slate-900">{t('payment.confirmed')}</h3>
        <p className="text-sm text-slate-600">
          {t('payment.confirmedText', {
            rental: formatCurrency(reservation.rentalAmount, reservation.currency),
            deposit: formatCurrency(reservation.securityDeposit, reservation.currency),
          })}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" onClick={handleDownload} isLoading={isGenerating} leftIcon={<FileDown className="size-4" />}>
          {t('payment.downloadPdf')}
        </Button>
        <Button onClick={onDone}>{doneLabel ?? t('payment.done')}</Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <ReceiptShareButtons reservationId={reservation.id} size="sm" />
      </div>
    </div>
  )
}
