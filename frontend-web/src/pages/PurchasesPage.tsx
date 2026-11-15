import { Check, CreditCard, ShoppingBag, Tag, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { PageHeader } from '../components/common/PageHeader'
import { Pagination } from '../components/common/Pagination'
import { StatusBadge } from '../components/common/StatusBadge'
import { EquipmentImage } from '../components/equipment/EquipmentImage'
import { PurchasePaymentModal } from '../components/purchases/PurchasePaymentModal'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import { useMutation } from '../hooks/useMutation'
import { usePagination } from '../hooks/usePagination'
import { useQueryParam } from '../hooks/useQueryParam'
import { buildPath, PATHS } from '../routes/paths'
import { ENDPOINTS } from '../services/endpoints'
import { purchaseService } from '../services/purchaseService'
import type { PageResponse, PurchaseRequest, ReservationRole } from '../types'
import { formatCurrency, reservationCode } from '../utils/format'

type Decision = { kind: 'accept' | 'reject' | 'cancel'; request: PurchaseRequest }

const formatDay = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Purchases of rented machines, from either side: the renter's "My purchases" (cancel, pay once
 * accepted) and the owner's "Sales" (accept or reject). Same list, the role in the URL.
 */
export default function PurchasesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [roleParam] = useQueryParam('role', 'RENTER')
  const role: ReservationRole = roleParam === 'OWNER' ? 'OWNER' : 'RENTER'
  const { page, size, setPage, setSize } = usePagination()
  const list = useFetch<PageResponse<PurchaseRequest>>(ENDPOINTS.purchaseRequests, { role, page, size })
  const [decision, setDecision] = useState<Decision | null>(null)
  const [paying, setPaying] = useState<PurchaseRequest | null>(null)
  const canDecide = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const decide = useMutation(
    ({ kind, request }: Decision) =>
      kind === 'accept' ? purchaseService.accept(request.id) : kind === 'reject' ? purchaseService.reject(request.id) : purchaseService.cancel(request.id),
    {
      successMessage: (saved) => t(`purchase.done.${saved.status}`),
      errorTitle: t('purchase.actionFailed'),
      onSuccess: () => {
        setDecision(null)
        list.refetch()
      },
    },
  )

  const requests = list.data?.content ?? []
  const pending = requests.filter((request) => request.status === 'PENDING').length

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <PageHeader
        title={t(role === 'OWNER' ? 'purchase.salesTitle' : 'purchase.mineTitle')}
        description={
          role === 'OWNER' && pending > 0
            ? t('purchase.salesPending', { count: pending })
            : t(role === 'OWNER' ? 'purchase.salesDescription' : 'purchase.mineDescription')
        }
      />

      {list.error && <ErrorState error={list.error} onRetry={list.refetch} />}

      {!list.error && list.isLoading && !list.data && (
        <ul className="space-y-3" aria-hidden="true">
          {[0, 1].map((key) => (
            <li key={key} className="h-36 rounded-xl bg-raised" />
          ))}
        </ul>
      )}

      {list.data && requests.length === 0 && (
        <EmptyState
          icon={role === 'OWNER' ? Tag : ShoppingBag}
          title={t(role === 'OWNER' ? 'purchase.emptySalesTitle' : 'purchase.emptyMineTitle')}
          description={t(role === 'OWNER' ? 'purchase.emptySalesText' : 'purchase.emptyMineText')}
          action={
            <Link
              to={role === 'OWNER' ? PATHS.fleet : `${PATHS.reservations}?role=RENTER`}
              className="inline-flex h-9 items-center rounded-md bg-ink px-3.5 text-sm font-medium text-white hover:bg-ink-hover"
            >
              {t(role === 'OWNER' ? 'purchase.goToFleet' : 'purchase.goToReservations')}
            </Link>
          }
        />
      )}

      {requests.length > 0 && (
        <ul className="space-y-3">
          {requests.map((request) => (
            <li key={request.id} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[160px_minmax(0,1fr)_auto] sm:items-center">
              <Link to={buildPath.equipmentDetail(request.equipmentId)} tabIndex={-1} aria-hidden="true" className="block overflow-hidden rounded-lg">
                <EquipmentImage src={request.equipmentImageUrl} alt="" className="aspect-[16/10] w-full" />
              </Link>

              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={buildPath.equipmentDetail(request.equipmentId)} className="truncate font-semibold text-ink hover:underline">
                    {request.equipmentName}
                  </Link>
                  <StatusBadge kind="purchase" status={request.status} />
                </div>
                <p className="text-sm text-slate-600">
                  {role === 'OWNER'
                    ? t('purchase.buyer', { name: request.buyerCompanyName })
                    : t('purchase.seller', { name: request.sellerCompanyName })}
                  {' · '}
                  {t('purchase.fromReservation', { code: reservationCode(request.reservationId) })}
                  {' · '}
                  {request.paidAt ? t('purchase.paidOn', { date: formatDay(request.paidAt) }) : t('purchase.requestedOn', { date: formatDay(request.createdAt) })}
                </p>
                <p className="num text-sm text-slate-600">
                  {t('purchase.inlineBreakdown', {
                    list: formatCurrency(request.listPrice, request.currency),
                    credit: formatCurrency(request.rentCredit, request.currency),
                  })}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2 sm:items-end">
                <p className="num text-xl font-bold text-ink">{formatCurrency(request.finalPrice, request.currency)}</p>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {role === 'OWNER' && request.status === 'PENDING' && canDecide && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setDecision({ kind: 'reject', request })} leftIcon={<X className="size-4" />}>
                        {t('purchase.reject')}
                      </Button>
                      <Button size="sm" variant="primary" onClick={() => setDecision({ kind: 'accept', request })} leftIcon={<Check className="size-4" />}>
                        {t('purchase.accept')}
                      </Button>
                    </>
                  )}
                  {role === 'OWNER' && request.status === 'ACCEPTED' && (
                    <span className="text-sm text-slate-600">{t('purchase.waitingPayment')}</span>
                  )}
                  {role === 'RENTER' && (request.status === 'PENDING' || request.status === 'ACCEPTED') && (
                    <Button size="sm" variant="ghost" onClick={() => setDecision({ kind: 'cancel', request })}>
                      {t('purchase.cancel')}
                    </Button>
                  )}
                  {role === 'RENTER' && request.status === 'PENDING' && (
                    <span className="self-center text-sm text-slate-600">{t('purchase.waitingOwner')}</span>
                  )}
                  {role === 'RENTER' && request.status === 'ACCEPTED' && (
                    <Button size="sm" variant="action" onClick={() => setPaying(request)} leftIcon={<CreditCard className="size-4" />}>
                      {t('purchase.pay')}
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {list.data && <Pagination pageData={list.data} onPageChange={setPage} onSizeChange={setSize} isDisabled={list.isLoading} />}

      <ConfirmDialog
        isOpen={decision !== null}
        title={decision ? t(`purchase.confirm.${decision.kind}.title`) : ''}
        message={
          decision
            ? t(`purchase.confirm.${decision.kind}.message`, {
                name: decision.request.equipmentName,
                company: role === 'OWNER' ? decision.request.buyerCompanyName : decision.request.sellerCompanyName,
                price: formatCurrency(decision.request.finalPrice, decision.request.currency),
              })
            : ''
        }
        confirmLabel={decision ? t(`purchase.confirm.${decision.kind}.cta`) : ''}
        variant={decision?.kind === 'accept' ? 'primary' : 'danger'}
        isLoading={decide.isLoading}
        onConfirm={() => decision && void decide.mutate(decision)}
        onClose={() => setDecision(null)}
      />

      {paying && (
        <PurchasePaymentModal
          request={paying}
          onClose={() => setPaying(null)}
          onPaid={() => list.refetch()}
        />
      )}
    </div>
  )
}
