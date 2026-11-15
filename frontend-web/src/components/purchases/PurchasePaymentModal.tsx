import { BadgeCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '../../hooks/useMutation'
import { purchaseService } from '../../services/purchaseService'
import type { PurchaseRequest } from '../../types'
import { formatCurrency } from '../../utils/format'
import { Button } from '../common/Button'
import { Modal } from '../common/Modal'
import { PaymentForm } from '../payments/PaymentForm'
import { PriceBreakdown } from './PriceBreakdown'

interface PurchasePaymentModalProps {
  request: PurchaseRequest
  onClose: () => void
  onPaid: () => void
}

/** The buyer pays an accepted purchase by card: the same checkout as a rental, for the price left after the credit. */
export function PurchasePaymentModal({ request, onClose, onPaid }: PurchasePaymentModalProps) {
  const { t } = useTranslation()
  const [paid, setPaid] = useState<PurchaseRequest | null>(null)
  const payment = useMutation((token: string) => purchaseService.pay(request.id, token), {
    successMessage: t('purchase.paidToast'),
    errorTitle: t('payment.failed'),
    onSuccess: (result) => {
      setPaid(result)
      onPaid()
    },
  })

  return (
    <Modal isOpen title={paid ? t('purchase.paidTitle') : t('purchase.payTitle', { name: request.equipmentName })} onClose={onClose} isDismissable={!payment.isLoading}>
      {paid ? (
        <div className="space-y-4 text-center">
          <BadgeCheck className="mx-auto size-12 text-positive" aria-hidden="true" />
          <p className="text-sm leading-6 text-ink">
            {t('purchase.paidText', {
              name: paid.equipmentName,
              price: formatCurrency(paid.finalPrice, paid.currency),
              seller: paid.sellerCompanyName,
            })}
          </p>
          <Button onClick={onClose}>{t('common.close')}</Button>
        </div>
      ) : (
        <PaymentForm
          checkout={{
            summary: (
              <PriceBreakdown listPrice={request.listPrice} rentCredit={request.rentCredit} finalPrice={request.finalPrice} currency={request.currency} />
            ),
            amount: request.finalPrice,
            currency: request.currency,
            pay: payment.mutate,
            isPaying: payment.isLoading,
          }}
        />
      )}
    </Modal>
  )
}
