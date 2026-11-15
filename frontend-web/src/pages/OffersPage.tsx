import { ArrowRight, Check, Handshake, MessageSquareReply, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { Input } from '../components/common/Input'
import { Modal } from '../components/common/Modal'
import { PageHeader } from '../components/common/PageHeader'
import { Pagination } from '../components/common/Pagination'
import { EquipmentImage } from '../components/equipment/EquipmentImage'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import { useMutation } from '../hooks/useMutation'
import { usePagination } from '../hooks/usePagination'
import { useQueryParam } from '../hooks/useQueryParam'
import { buildPath, PATHS } from '../routes/paths'
import { ENDPOINTS } from '../services/endpoints'
import { offerService } from '../services/offerService'
import type { OfferStatus, PageResponse, PriceOffer, ReservationRole } from '../types'
import { cn } from '../utils/cn'
import { formatCurrency, formatDateRange } from '../utils/format'

const STATUS_TONE: Record<OfferStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-900',
  COUNTERED: 'bg-blue-100 text-blue-900',
  ACCEPTED: 'bg-emerald-100 text-emerald-900',
  USED: 'bg-emerald-100 text-emerald-900',
  REJECTED: 'bg-slate-200 text-slate-700',
  CANCELLED: 'bg-slate-200 text-slate-700',
}

type Action = 'accept' | 'reject' | 'cancel'

/**
 * Negotiations from either side: the renter's sent offers (answer a counter, book at the agreed price)
 * and the owner's received ones (accept, reject or counter). The role travels in the URL.
 */
export default function OffersPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [roleParam] = useQueryParam('role', 'RENTER')
  const role: ReservationRole = roleParam === 'OWNER' ? 'OWNER' : 'RENTER'
  const { page, size, setPage, setSize } = usePagination()
  const list = useFetch<PageResponse<PriceOffer>>(ENDPOINTS.offers, { role, page, size })
  const [countering, setCountering] = useState<PriceOffer | null>(null)
  const canDecide = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const act = useMutation(
    ({ action, offer }: { action: Action; offer: PriceOffer }) =>
      action === 'accept' ? offerService.accept(offer.id) : action === 'reject' ? offerService.reject(offer.id) : offerService.cancel(offer.id),
    {
      successMessage: (saved) => t(`offers.done.${saved.status}`),
      errorTitle: t('offers.actionFailed'),
      onSuccess: () => list.refetch(),
    },
  )

  const offers = list.data?.content ?? []
  const waiting = offers.filter((offer) => (role === 'OWNER' ? offer.status === 'PENDING' : offer.status === 'COUNTERED')).length

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <PageHeader
        title={t(role === 'OWNER' ? 'offers.receivedTitle' : 'offers.sentTitle')}
        description={waiting > 0 ? t('offers.waiting', { count: waiting }) : t(role === 'OWNER' ? 'offers.receivedText' : 'offers.sentDescription')}
        breadcrumbs={[{ label: t('nav.offers') }]}
      />

      <nav aria-label={t('offers.sides')} className="inline-flex rounded-lg bg-raised p-1">
        {(['RENTER', 'OWNER'] as const).map((side) => (
          <Link
            key={side}
            to={`${PATHS.offers}?role=${side}`}
            aria-current={role === side ? 'page' : undefined}
            className={cn(
              'rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors',
              role === side ? 'bg-white text-ink shadow-sm' : 'text-slate-600 hover:text-ink',
            )}
          >
            {t(side === 'OWNER' ? 'offers.tabReceived' : 'offers.tabSent')}
          </Link>
        ))}
      </nav>

      {list.error && <ErrorState error={list.error} onRetry={list.refetch} />}

      {!list.error && list.isLoading && !list.data && (
        <ul className="space-y-3" aria-hidden="true">
          {[0, 1].map((key) => (
            <li key={key} className="h-36 rounded-xl bg-raised" />
          ))}
        </ul>
      )}

      {list.data && offers.length === 0 && (
        <EmptyState
          icon={Handshake}
          title={t(role === 'OWNER' ? 'offers.emptyReceivedTitle' : 'offers.emptySentTitle')}
          description={t(role === 'OWNER' ? 'offers.emptyReceivedText' : 'offers.emptySentText')}
          action={
            role === 'RENTER' && (
              <Link to={PATHS.catalog} className="inline-flex h-9 items-center rounded-md bg-ink px-3.5 text-sm font-medium text-white hover:bg-ink-hover">
                {t('offers.goToCatalog')}
              </Link>
            )
          }
        />
      )}

      {offers.length > 0 && (
        <ul className="space-y-3">
          {offers.map((offer) => {
            const otherSide = role === 'OWNER' ? offer.renterCompanyName : offer.ownerCompanyName
            const busy = act.isLoading
            return (
              <li key={offer.id} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center">
                <Link to={buildPath.equipmentDetail(offer.equipmentId)} tabIndex={-1} aria-hidden="true" className="block overflow-hidden rounded-lg">
                  <EquipmentImage src={offer.equipmentImageUrl} alt="" className="aspect-[16/10] w-full" />
                </Link>

                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={buildPath.equipmentDetail(offer.equipmentId)} className="truncate font-semibold text-ink hover:underline">
                      {offer.equipmentName}
                    </Link>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_TONE[offer.status])}>
                      {t(`offers.status.${offer.status}`)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {t(role === 'OWNER' ? 'offers.from' : 'offers.to', { company: otherSide })}
                    {offer.startDate && offer.endDate && ` · ${formatDateRange(offer.startDate, offer.endDate)}`}
                  </p>
                  <PriceSteps offer={offer} />
                  {offer.renterMessage && <Quote label={t('offers.renterSaid')} text={offer.renterMessage} />}
                  {offer.ownerMessage && <Quote label={t('offers.ownerSaid')} text={offer.ownerMessage} />}
                </div>

                <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                  {role === 'OWNER' && offer.status === 'PENDING' && canDecide && (
                    <>
                      <Button size="sm" variant="primary" disabled={busy} onClick={() => void act.mutate({ action: 'accept', offer })} leftIcon={<Check className="size-4" />}>
                        {t('offers.accept', { price: formatCurrency(offer.proposedDailyRate, offer.currency) })}
                      </Button>
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => setCountering(offer)} leftIcon={<MessageSquareReply className="size-4" />}>
                        {t('offers.counter')}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act.mutate({ action: 'reject', offer })} leftIcon={<X className="size-4" />}>
                        {t('offers.reject')}
                      </Button>
                    </>
                  )}
                  {role === 'RENTER' && offer.status === 'COUNTERED' && offer.counterDailyRate !== null && (
                    <>
                      <Button size="sm" variant="primary" disabled={busy} onClick={() => void act.mutate({ action: 'accept', offer })} leftIcon={<Check className="size-4" />}>
                        {t('offers.accept', { price: formatCurrency(offer.counterDailyRate, offer.currency) })}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act.mutate({ action: 'reject', offer })} leftIcon={<X className="size-4" />}>
                        {t('offers.reject')}
                      </Button>
                    </>
                  )}
                  {role === 'RENTER' && offer.status === 'PENDING' && (
                    <>
                      <span className="text-sm text-slate-600">{t('offers.waitingOwner')}</span>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act.mutate({ action: 'cancel', offer })}>
                        {t('offers.cancel')}
                      </Button>
                    </>
                  )}
                  {role === 'RENTER' && offer.status === 'ACCEPTED' && (
                    <Link
                      to={`${buildPath.equipmentDetail(offer.equipmentId)}?offer=${offer.id}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-action px-3.5 text-sm font-semibold text-white hover:bg-action-hover"
                    >
                      {t('offers.bookAtPrice')}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  )}
                  {role === 'OWNER' && offer.status === 'COUNTERED' && <span className="text-sm text-slate-600">{t('offers.waitingRenter')}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {list.data && <Pagination pageData={list.data} onPageChange={setPage} onSizeChange={setSize} isDisabled={list.isLoading} />}

      {countering && (
        <CounterModal
          offer={countering}
          onClose={() => setCountering(null)}
          onSent={() => {
            setCountering(null)
            list.refetch()
          }}
        />
      )}
    </div>
  )
}

/** Published price, the renter's proposal, the owner's counter and the agreed price, left to right. */
function PriceSteps({ offer }: { offer: PriceOffer }) {
  const { t } = useTranslation()
  const steps = [
    { key: 'list', label: t('offers.listPrice'), value: offer.listDailyRate, strike: true },
    { key: 'proposed', label: t('offers.proposed'), value: offer.proposedDailyRate },
    offer.counterDailyRate !== null && { key: 'counter', label: t('offers.countered'), value: offer.counterDailyRate },
    offer.agreedDailyRate !== null && { key: 'agreed', label: t('offers.agreed'), value: offer.agreedDailyRate, strong: true },
  ].filter(Boolean) as { key: string; label: string; value: number; strike?: boolean; strong?: boolean }[]

  return (
    <dl className="flex flex-wrap items-end gap-x-5 gap-y-2">
      {steps.map((step) => (
        <div key={step.key}>
          <dt className="text-xs text-slate-600">{step.label}</dt>
          <dd
            className={cn(
              'num text-sm font-semibold text-ink',
              step.strike && 'text-slate-500 line-through',
              step.strong && 'text-base font-bold text-positive',
            )}
          >
            {formatCurrency(step.value, offer.currency)}
            <span className="text-xs font-normal text-slate-500"> {t('common.perDay')}</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

function Quote({ label, text }: { label: string; text: string }) {
  return (
    <p className="rounded-md bg-raised px-3 py-2 text-sm text-ink">
      <span className="font-semibold">{label}: </span>
      {text}
    </p>
  )
}

/** The owner's answer with another price, between the proposal and the published rate. */
function CounterModal({ offer, onClose, onSent }: { offer: PriceOffer; onClose: () => void; onSent: () => void }) {
  const { t } = useTranslation()
  const [rate, setRate] = useState(String(Math.round((offer.proposedDailyRate + offer.listDailyRate) / 2)))
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const send = useMutation((value: number) => offerService.counter(offer.id, { dailyRate: value, message: message.trim() || undefined }), {
    successMessage: t('offers.done.COUNTERED'),
    errorTitle: t('offers.actionFailed'),
    onSuccess: onSent,
  })

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const value = Number(rate)
    if (!(value > offer.proposedDailyRate && value < offer.listDailyRate)) {
      setError(
        t('offers.counterRange', {
          min: formatCurrency(offer.proposedDailyRate, offer.currency),
          max: formatCurrency(offer.listDailyRate, offer.currency),
        }),
      )
      return
    }
    setError(null)
    await send.mutate(value)
  }

  return (
    <Modal isOpen onClose={onClose} title={t('offers.counterTitle')} size="sm" isDismissable={!send.isLoading}>
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm leading-6 text-slate-700">
          {t('offers.counterText', {
            company: offer.renterCompanyName,
            proposed: formatCurrency(offer.proposedDailyRate, offer.currency),
            list: formatCurrency(offer.listDailyRate, offer.currency),
          })}
        </p>
        <Input label={t('offers.yourCounter')} inputMode="decimal" required autoFocus value={rate} onChange={(event) => setRate(event.target.value.replace(',', '.'))} error={error ?? undefined} />
        <Input label={t('offers.messageOptional')} maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={send.isLoading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" isLoading={send.isLoading}>
            {t('offers.sendCounter')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
