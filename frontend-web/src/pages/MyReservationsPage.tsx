import { BookOpen, CalendarPlus, CalendarX2, Check, CreditCard, FileDown, FilterX, Flag, Play, Search, ShoppingBag, Star, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { ReceiptShareButtons } from '../components/receipts/ReceiptShareButtons'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { PageHeader } from '../components/common/PageHeader'
import { Pagination } from '../components/common/Pagination'
import { SkeletonLoader } from '../components/common/SkeletonLoader'
import { ReservationCard } from '../components/reservations/ReservationCard'
import { ReservationTimeline } from '../components/reservations/ReservationTimeline'
import { PurchaseOfferModal } from '../components/purchases/PurchaseOfferModal'
import { ReviewModal } from '../components/reviews/ReviewModal'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import { useMutation } from '../hooks/useMutation'
import { useRefreshSignal } from '../hooks/useRefreshSignal'
import { useToast } from '../hooks/useToast'
import { usePagination } from '../hooks/usePagination'
import { useQueryParam } from '../hooks/useQueryParam'
import { PATHS } from '../routes/paths'
import { api } from '../services/api'
import { ENDPOINTS } from '../services/endpoints'
import { paymentService } from '../services/paymentService'
import { reservationService } from '../services/reservationService'
import type { PageResponse, Reservation, ReservationRole, ReservationStatus } from '../types'
import { cn } from '../utils/cn'
import { downloadReceipt } from '../utils/downloadReceipt'
import { formatNumber } from '../utils/format'
import { googleCalendarUrl } from '../utils/googleCalendar'
import { RESERVATION_STATUSES } from '../utils/labels'

/** The checkout (and Stripe.js with it) loads only when someone pays a reservation. */
const PaymentModal = lazy(() =>
  import('../components/payments/PaymentModal').then((module) => ({ default: module.PaymentModal })),
)

type ReservationAction = 'confirm' | 'reject' | 'cancel' | 'start' | 'complete'

/** How each action asks for confirmation; its texts live in i18n `reservations.actions`. */
interface ActionConfig {
  variant: 'primary' | 'danger'
  askForReason: boolean
}

const ACTIONS: Record<ReservationAction, ActionConfig> = {
  confirm: { variant: 'primary', askForReason: false },
  reject: { variant: 'danger', askForReason: true },
  cancel: { variant: 'danger', askForReason: true },
  start: { variant: 'primary', askForReason: false },
  complete: { variant: 'primary', askForReason: false },
}

const ACTION_ICONS = { confirm: Check, reject: X, cancel: CalendarX2, start: Play, complete: Flag } as const

/** Mirrors the backend's ReservationStatusPolicy so the UI only offers transitions that can succeed. */
function availableActions(reservation: Reservation, role: ReservationRole, canManage: boolean): ReservationAction[] {
  const actions: ReservationAction[] = []
  if (role === 'OWNER' && canManage) {
    if (reservation.status === 'PENDING') actions.push('confirm', 'reject')
    if (reservation.status === 'CONFIRMED') actions.push('start')
    if (reservation.status === 'IN_PROGRESS') actions.push('complete')
  }
  if (reservation.status === 'PENDING' || reservation.status === 'CONFIRMED') actions.push('cancel')
  return actions
}

function runAction(action: ReservationAction, reservation: Reservation, reason: string): Promise<Reservation> {
  switch (action) {
    case 'confirm':
      return reservationService.confirm(reservation.id)
    case 'reject':
      return reservationService.updateStatus(reservation.id, 'REJECTED', reason)
    case 'cancel':
      return reservationService.cancel(reservation.id, reason)
    case 'start':
      return reservationService.updateStatus(reservation.id, 'IN_PROGRESS')
    case 'complete':
      return reservationService.updateStatus(reservation.id, 'COMPLETED')
  }
}

const ALL = 'ALL'

/** A renter can ask to buy the machine once the owner has confirmed the rental, and keeps the option after returning it. */
const PURCHASABLE_FROM: ReservationStatus[] = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED']
/** Reservations the renter can still put on their calendar: confirmed and not finished. */
const ON_CALENDAR: ReservationStatus[] = ['CONFIRMED', 'IN_PROGRESS']

/** Reservations per status for the current side (renter or owner): the totals behind the filter cards. */
function useStatusCounts(role: ReservationRole, reloadKey: number): Record<string, number> | null {
  const refreshSignal = useRefreshSignal()
  const key = `${role}|${reloadKey}|${refreshSignal}`
  const [result, setResult] = useState<{ key: string; counts: Record<string, number> } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all(
      [ALL, ...RESERVATION_STATUSES].map(async (status) => {
        const { data } = await api.get<PageResponse<Reservation>>(ENDPOINTS.reservations, {
          params: { role, status: status === ALL ? undefined : status, page: 0, size: 1 },
          signal: controller.signal,
        })
        return [status, data.totalElements] as const
      }),
    )
      .then((entries) => setResult({ key, counts: Object.fromEntries(entries) }))
      .catch(() => undefined)
    return () => controller.abort()
  }, [key, role])

  return result?.key === key ? result.counts : null
}

function isReservationRole(value: string): value is ReservationRole {
  return value === 'RENTER' || value === 'OWNER'
}

function isReservationStatus(value: string): value is ReservationStatus {
  return (RESERVATION_STATUSES as string[]).includes(value)
}

export default function MyReservationsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [roleParam] = useQueryParam('role', 'RENTER')
  const [statusParam, setStatusParam] = useQueryParam('status')
  const role: ReservationRole = isReservationRole(roleParam) ? roleParam : 'RENTER'
  const status = isReservationStatus(statusParam) ? statusParam : undefined
  const { page, size, setPage, setSize } = usePagination()
  const canManage = user?.role !== 'OPERATOR'

  const { data, error, isLoading, refetch: refetchList } = useFetch<PageResponse<Reservation>>(ENDPOINTS.reservations, {
    role,
    status,
    page,
    size,
  })
  const [countsVersion, setCountsVersion] = useState(0)
  const counts = useStatusCounts(role, countsVersion)
  const refetch = () => {
    refetchList()
    setCountsVersion((version) => version + 1)
  }

  const toast = useToast()
  const [pending, setPending] = useState<{ action: ReservationAction; reservation: Reservation } | null>(null)
  const [payingReservation, setPayingReservation] = useState<Reservation | null>(null)
  const [reviewingReservation, setReviewingReservation] = useState<Reservation | null>(null)
  const [buyingReservation, setBuyingReservation] = useState<Reservation | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  async function handleDownloadReceipt(reservation: Reservation) {
    setDownloadingId(reservation.id)
    try {
      await downloadReceipt(reservation, await paymentService.list(reservation.id))
    } catch {
      toast.error(t('reservations.receiptFailed'), t('reservations.receiptRetry'))
    } finally {
      setDownloadingId(null)
    }
  }
  const pendingConfig = pending ? ACTIONS[pending.action] : null
  const pendingText = pending ? (key: 'label' | 'title' | 'message' | 'success') => t(`reservations.actions.${pending.action}.${key}`) : null

  const performAction = useMutation(runAction, {
    successMessage: () => (pendingText ? pendingText('success') : t('reservations.updated')),
    errorTitle: t('reservations.updateFailed'),
    onSuccess: () => {
      setPending(null)
      refetch()
    },
  })

  function renderActions(reservation: Reservation) {
    const canPay =
      role === 'RENTER' &&
      reservation.paymentStatus === 'UNPAID' &&
      (reservation.status === 'PENDING' || reservation.status === 'CONFIRMED')
    return (
      <>
        {canPay && (
          <Button size="sm" variant="action" onClick={() => setPayingReservation(reservation)} leftIcon={<CreditCard className="size-4" />}>
            {t('reservations.pay')}
          </Button>
        )}
        {reservation.paymentStatus !== 'UNPAID' && (
          <Button
            size="sm"
            variant="secondary"
            isLoading={downloadingId === reservation.id}
            onClick={() => void handleDownloadReceipt(reservation)}
            leftIcon={<FileDown className="size-4" />}
            aria-label={t('reservations.downloadReceiptOf', { name: reservation.equipmentName })}
          >
            {t('reservations.receiptPdf')}
          </Button>
        )}
        {role === 'RENTER' && reservation.paymentStatus === 'PAID' && <ReceiptShareButtons reservationId={reservation.id} size="sm" />}
        {/* Once paid, the machine is on its way: the renter gets the guide to receive and use it. */}
        {role === 'RENTER' && reservation.paymentStatus === 'PAID' && reservation.equipmentManualUrl && (
          <a
            href={reservation.equipmentManualUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('reservations.manualOf', { name: reservation.equipmentName })}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-ink transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <BookOpen className="size-4" aria-hidden="true" />
            {t('reservations.manual')}
          </a>
        )}
        {/* Confirmed rentals go to the renter's calendar (the confirmation email also carries the invitation). */}
        {role === 'RENTER' && ON_CALENDAR.includes(reservation.status) && (
          <a
            href={googleCalendarUrl(reservation, {
              title: t('reservations.calendarTitle', { name: reservation.equipmentName }),
              details: t('reservations.calendarDetails', {
                id: reservation.id,
                days: reservation.totalDays,
                url: new URL(PATHS.reservations.slice(1), new URL(import.meta.env.BASE_URL, window.location.origin)).href,
              }),
            })}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('reservations.addToCalendarOf', { name: reservation.equipmentName })}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-ink transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <CalendarPlus className="size-4" aria-hidden="true" />
            {t('reservations.addToCalendar')}
          </a>
        )}
        {role === 'RENTER' && reservation.status === 'COMPLETED' && !reservation.reviewed && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => setReviewingReservation(reservation)}
            leftIcon={<Star className="size-4" />}
          >
            {t('reviews.rate')}
          </Button>
        )}
        {role === 'RENTER' && reservation.equipmentSalePrice !== null && PURCHASABLE_FROM.includes(reservation.status) && (
          <Button size="sm" variant="secondary" onClick={() => setBuyingReservation(reservation)} leftIcon={<ShoppingBag className="size-4" />}>
            {t('purchase.buy')}
          </Button>
        )}
        {role === 'RENTER' && reservation.reviewed && (
          <span className="inline-flex items-center gap-1 px-2 text-sm font-medium text-slate-600">
            <Star className="size-4 fill-brand text-brand" aria-hidden="true" />
            {t('reviews.rated')}
          </span>
        )}
        {availableActions(reservation, role, canManage).map((action) => {
          const Icon = ACTION_ICONS[action]
          const isNegative = action === 'reject' || action === 'cancel'
          return (
            <Button
              key={action}
              size="sm"
              variant={isNegative ? 'ghost' : 'primary'}
              disabled={performAction.isLoading}
              onClick={() => setPending({ action, reservation })}
              leftIcon={<Icon className="size-4" />}
            >
              {t(`reservations.actions.${action}.label`)}
            </Button>
          )
        })}
      </>
    )
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <PageHeader
        title={t(`status.reservationRole.${role}`)}
        description={role === 'RENTER' ? t('reservations.renterDescription') : t('reservations.ownerDescription')}
        breadcrumbs={[{ label: t(`status.reservationRole.${role}`) }]}
      />

      <div className="-mx-4 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label={t('reservations.filterByStatus')} className="-mb-px flex gap-6">
          {([ALL, ...RESERVATION_STATUSES] as const).map((value) => {
            const isSelected = (status ?? ALL) === value
            const count = counts?.[value]
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setStatusParam(value === ALL ? '' : value)}
                className={cn(
                  'flex h-11 shrink-0 items-center gap-2 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors duration-200',
                  isSelected ? 'border-brand text-ink' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-ink',
                )}
              >
                {t(`reservations.tabs.${value}`)}
                <span className={cn('num rounded-full px-2 py-0.5 text-xs', isSelected ? 'bg-ink text-white' : 'bg-slate-100 text-slate-600')}>
                  {count === undefined ? '–' : formatNumber(count)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={refetch} />}
      {!error && !data && <SkeletonLoader variant="list" count={4} />}

      {!error && data && data.totalElements === 0 && (
        <EmptyState
          icon={CalendarX2}
          title={status ? t('reservations.emptyWithStatus', { status: t(`status.reservation.${status}`).toLowerCase() }) : t('reservations.empty')}
          description={
            status
              ? t('reservations.emptyWithStatusText')
              : role === 'RENTER'
                ? t('reservations.emptyRenterText')
                : t('reservations.emptyOwnerText')
          }
          action={
            status ? (
              <Button variant="secondary" onClick={() => setStatusParam('')} leftIcon={<FilterX className="size-4" />}>
                {t('reservations.seeAll')}
              </Button>
            ) : (
              role === 'RENTER' && (
                <Link
                  to={PATHS.catalog}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-action px-3.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-action-hover active:scale-[0.98]"
                >
                  <Search className="size-4" aria-hidden="true" /> {t('reservations.exploreCatalog')}
                </Link>
              )
            )
          }
        />
      )}

      {!error && data && data.totalElements > 0 && (
        <div aria-busy={isLoading} className={cn('space-y-4 transition-opacity', isLoading && 'opacity-60')}>
          {role === 'RENTER' ? (
            <ReservationTimeline reservations={data.content} renderActions={renderActions} />
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {data.content.map((reservation) => (
                <li key={reservation.id} className="transition-colors duration-200 hover:bg-slate-50/60">
                  <ReservationCard reservation={reservation} role={role} actions={renderActions(reservation)} />
                </li>
              ))}
            </ul>
          )}
          <Pagination pageData={data} onPageChange={setPage} onSizeChange={setSize} isDisabled={isLoading} />
        </div>
      )}

      {payingReservation && (
        <Suspense fallback={null}>
          <PaymentModal
            reservation={payingReservation}
            onClose={() => setPayingReservation(null)}
            onPaid={refetch}
          />
        </Suspense>
      )}
      {buyingReservation && <PurchaseOfferModal reservation={buyingReservation} onClose={() => setBuyingReservation(null)} />}

      {reviewingReservation && (
        <ReviewModal
          reservation={reviewingReservation}
          onClose={() => setReviewingReservation(null)}
          onSaved={refetch}
        />
      )}

      {pending && pendingConfig && pendingText && (
        <ConfirmDialog
          isOpen
          title={pendingText('title')}
          message={`${pending.reservation.equipmentName}: ${pendingText('message')}`}
          confirmLabel={pendingText('label')}
          variant={pendingConfig.variant}
          askForReason={pendingConfig.askForReason}
          isLoading={performAction.isLoading}
          onConfirm={(reason) => void performAction.mutate(pending.action, pending.reservation, reason)}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  )
}
