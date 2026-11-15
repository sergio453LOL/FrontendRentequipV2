import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useFetch } from '../../hooks/useFetch'
import { useMutation } from '../../hooks/useMutation'
import { PATHS } from '../../routes/paths'
import { ENDPOINTS } from '../../services/endpoints'
import { purchaseService } from '../../services/purchaseService'
import type { PurchaseQuote, Reservation } from '../../types'
import { Button } from '../common/Button'
import { ErrorState } from '../common/ErrorState'
import { Modal } from '../common/Modal'
import { PriceBreakdown } from './PriceBreakdown'

interface PurchaseOfferModalProps {
  reservation: Reservation
  onClose: () => void
}

/**
 * The renter asks to keep the machine: the price with the rent already paid taken off, and what happens
 * next (the owner answers, then the renter pays by card from "My purchases").
 */
export function PurchaseOfferModal({ reservation, onClose }: PurchaseOfferModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const quote = useFetch<PurchaseQuote>(ENDPOINTS.purchaseQuote(reservation.id))
  const send = useMutation(() => purchaseService.request(reservation.id), {
    successMessage: t('purchase.requested'),
    errorTitle: t('purchase.requestFailed'),
    onSuccess: () => {
      onClose()
      navigate(`${PATHS.purchases}?role=RENTER`)
    },
  })

  const data = quote.data
  const canSend = Boolean(data?.eligible) && data?.openRequestId === null

  return (
    <Modal
      isOpen
      title={t('purchase.offerTitle', { name: reservation.equipmentName })}
      onClose={onClose}
      isDismissable={!send.isLoading}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={send.isLoading}>
            {t('common.cancel')}
          </Button>
          {canSend && (
            <Button variant="action" isLoading={send.isLoading} onClick={() => void send.mutate()}>
              {t('purchase.send')}
            </Button>
          )}
        </div>
      }
    >
      {quote.error ? (
        <ErrorState error={quote.error} onRetry={quote.refetch} />
      ) : !data ? (
        <div className="h-40 rounded-lg bg-raised" aria-hidden="true" />
      ) : (
        <div className="space-y-4">
          {data.listPrice !== null && data.finalPrice !== null && (
            <PriceBreakdown
              listPrice={data.listPrice}
              rentCredit={data.rentCredit}
              rentCreditPercent={data.rentCreditPercent}
              rentPaid={data.rentPaid}
              finalPrice={data.finalPrice}
              currency={data.currency}
            />
          )}
          {data.openRequestId !== null ? (
            <p className="rounded-lg bg-raised px-4 py-3 text-sm text-ink">
              {t('purchase.alreadyRequested')}{' '}
              <Link to={`${PATHS.purchases}?role=RENTER`} onClick={onClose} className="font-semibold underline underline-offset-2">
                {t('purchase.seeMyPurchases')}
              </Link>
            </p>
          ) : data.eligible ? (
            <p className="text-sm leading-6 text-slate-600">{t('purchase.nextSteps')}</p>
          ) : (
            <p className="rounded-lg bg-raised px-4 py-3 text-sm text-ink">{t(`purchase.reasons.${data.reason ?? 'NOT_FOR_SALE'}`)}</p>
          )}
        </div>
      )}
    </Modal>
  )
}
