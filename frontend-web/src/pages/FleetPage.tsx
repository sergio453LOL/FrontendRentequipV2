import { motion } from 'framer-motion'
import { CalendarClock, CircleCheck, CirclePause, HardHat, PackageOpen, Plus, Trash2, Wrench, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { PageHeader } from '../components/common/PageHeader'
import { Pagination } from '../components/common/Pagination'
import { SkeletonLoader } from '../components/common/SkeletonLoader'
import { EquipmentImage } from '../components/equipment/EquipmentImage'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import { useMutation } from '../hooks/useMutation'
import { usePagination } from '../hooks/usePagination'
import { useQueryParam } from '../hooks/useQueryParam'
import { buildPath, PATHS } from '../routes/paths'
import { canPublish } from '../routes/roles'
import { ENDPOINTS } from '../services/endpoints'
import { equipmentService } from '../services/equipmentService'
import type { EquipmentSummary, PageResponse, Reservation } from '../types'
import { daysBetween, formatCurrency, formatDateRange, formatNumber, parseIsoDate, todayIso } from '../utils/format'

const OCCUPANCY_WINDOW_DAYS = 30
const HOLDING = new Set(['CONFIRMED', 'IN_PROGRESS'])

interface MachineOutlook {
  bookedDays: number
  next: Reservation | undefined
  pendingRequests: number
}

/** Days booked in the next 30, the next confirmed rental and the requests still waiting, for one machine. */
function outlookFor(machineId: number, reservations: Reservation[], today: Date): MachineOutlook {
  const own = reservations.filter((reservation) => reservation.equipmentId === machineId)
  const booked = new Set<number>()
  for (const reservation of own) {
    if (!HOLDING.has(reservation.status)) continue
    const start = Math.max(0, daysBetween(today, parseIsoDate(reservation.startDate)))
    const end = Math.min(OCCUPANCY_WINDOW_DAYS - 1, daysBetween(today, parseIsoDate(reservation.endDate)))
    for (let day = start; day <= end; day++) booked.add(day)
  }
  const next = own
    .filter((reservation) => HOLDING.has(reservation.status) && parseIsoDate(reservation.endDate) >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0]
  const pendingRequests = own.filter((reservation) => reservation.status === 'PENDING').length
  return { bookedDays: booked.size, next, pendingRequests }
}

function PublishButton() {
  const { t } = useTranslation()
  return (
    <Link
      to={PATHS.publishEquipment}
      className="inline-flex h-10 items-center gap-2 rounded-md bg-action px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-action-hover hover:shadow-md active:scale-[0.98]"
    >
      <Plus className="size-4" aria-hidden="true" /> {t('fleet.publish')}
    </Link>
  )
}

interface MachineCardProps {
  machine: EquipmentSummary
  outlook: MachineOutlook
  /** Only for roles that can publish; the backend refuses machines with pending or active reservations. */
  onDelete?: () => void
}

/** Where the machine is right now, as the owner thinks of it. */
type FleetState = 'onSite' | 'available' | 'maintenance' | 'inactive'

const FLEET_STATES: Record<FleetState, { icon: LucideIcon; chip: string; bar: string }> = {
  onSite: { icon: HardHat, chip: 'bg-[#2563eb] text-[#f8fafc]', bar: 'bg-[#2563eb]' },
  available: { icon: CircleCheck, chip: 'bg-[#059669] text-[#f8fafc]', bar: 'bg-[#10b981]' },
  maintenance: { icon: Wrench, chip: 'bg-brand text-[#0f172a]', bar: 'bg-brand' },
  inactive: { icon: CirclePause, chip: 'bg-[#475569] text-[#f8fafc]', bar: 'bg-[#94a3b8]' },
}

/** On site while a rental is in progress (or the backend marks it rented); otherwise its own status. */
function fleetStateOf(machine: EquipmentSummary, reservations: Reservation[]): FleetState {
  const inProgress = reservations.some((reservation) => reservation.equipmentId === machine.id && reservation.status === 'IN_PROGRESS')
  if (inProgress || machine.status === 'RENTED') return 'onSite'
  if (machine.status === 'MAINTENANCE') return 'maintenance'
  if (machine.status === 'INACTIVE') return 'inactive'
  return 'available'
}

function MachineCard({ machine, outlook, onDelete, state }: MachineCardProps & { state: FleetState }) {
  const { t } = useTranslation()
  const occupancy = outlook.bookedDays / OCCUPANCY_WINDOW_DAYS
  const { icon: StateIcon, chip, bar } = FLEET_STATES[state]
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
      <span className={`absolute inset-x-0 top-0 z-10 h-1 ${bar}`} aria-hidden="true" />
      <Link to={buildPath.equipmentDetail(machine.id)} className="relative block overflow-hidden" tabIndex={-1} aria-hidden="true">
        <EquipmentImage src={machine.primaryImageUrl} alt="" className="aspect-[16/10] w-full transition-transform duration-500 ease-out group-hover:scale-110" />
        <span className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ${chip}`}>
          <StateIcon className="size-3.5" aria-hidden="true" />
          {t(`fleet.states.${state}`)}
          {state === 'onSite' && (
            <span className="relative ml-0.5 flex size-2" aria-hidden="true">
              <span className="absolute inset-0 animate-ping rounded-full bg-white opacity-70 motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-white" />
            </span>
          )}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={buildPath.equipmentDetail(machine.id)} className="line-clamp-1 font-semibold text-ink hover:text-accent-ink">
              {machine.name}
            </Link>
            <p className="text-sm text-slate-500">
              {machine.brand} · {machine.model} · {machine.city}
            </p>
          </div>
          <p className="num shrink-0 text-right text-base font-bold text-ink">
            {formatCurrency(machine.dailyRate, machine.currency)}
            <span className="block text-xs font-normal text-slate-500">{t('fleet.perDay')}</span>
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="font-semibold text-slate-600">{t('fleet.occupancy', { days: OCCUPANCY_WINDOW_DAYS })}</span>
            <span className="num font-semibold text-ink">{Math.round(occupancy * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <span className="block h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${Math.round(occupancy * 100)}%` }} />
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
          <span className="flex items-center gap-1.5 text-slate-600">
            <CalendarClock className="size-4 text-slate-400" aria-hidden="true" />
            {outlook.next ? t('fleet.next', { range: formatDateRange(outlook.next.startDate, outlook.next.endDate) }) : t('fleet.noBookings')}
          </span>
          {outlook.pendingRequests > 0 && (
            <Link
              to={`${PATHS.reservations}?role=OWNER&status=PENDING`}
              className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-action-ink ring-1 ring-orange-200 ring-inset hover:bg-orange-100"
            >
              {t('fleet.requests', { count: outlook.pendingRequests })}
            </Link>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
              aria-label={t('fleet.deleteOf', { name: machine.name })}
            >
              <Trash2 className="size-3.5" aria-hidden="true" /> {t('fleet.delete')}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default function FleetPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { page, size, setPage, setSize } = usePagination()
  const today = parseIsoDate(todayIso())
  const fleet = useFetch<PageResponse<EquipmentSummary>>(user ? ENDPOINTS.companyEquipment(user.companyId) : null, { page, size })
  const owned = useFetch<PageResponse<Reservation>>(ENDPOINTS.reservations, { role: 'OWNER', size: 100 })
  const [deleting, setDeleting] = useState<EquipmentSummary | null>(null)
  // In the URL, so a filtered fleet survives a reload and can be shared.
  const [stateParam, setStateParam] = useQueryParam('estado')
  const stateFilter: FleetState | 'all' = Object.hasOwn(FLEET_STATES, stateParam) ? (stateParam as FleetState) : 'all'
  const removeMachine = useMutation((machine: EquipmentSummary) => equipmentService.remove(machine.id), {
    successMessage: t('fleet.deleted'),
    errorTitle: t('fleet.deleteFailed'),
    onSuccess: () => {
      setDeleting(null)
      fleet.refetch()
    },
  })

  if (!user) return null
  const publisher = canPublish(user.role)
  const reservations = owned.data?.content ?? []
  const total = fleet.data?.totalElements
  const machines = (fleet.data?.content ?? []).map((machine) => ({ machine, state: fleetStateOf(machine, reservations) }))

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <PageHeader
        title={t('fleet.title')}
        description={total === undefined ? t('fleet.loading') : t('fleet.summary', { count: total, formatted: formatNumber(total) })}
        breadcrumbs={[{ label: t('fleet.title') }]}
        actions={publisher && <PublishButton />}
      />

      {fleet.error && <ErrorState error={fleet.error} onRetry={fleet.refetch} />}
      {!fleet.error && !fleet.data && <SkeletonLoader variant="card" count={6} />}
      {!fleet.error && fleet.data && fleet.data.totalElements === 0 && (
        <EmptyState
          icon={PackageOpen}
          title={t('fleet.emptyTitle')}
          description={
            publisher
              ? t('fleet.emptyPublisher')
              : t('fleet.emptyOther')
          }
          action={publisher && <PublishButton />}
        />
      )}
      {!fleet.error && fleet.data && fleet.data.totalElements > 0 && (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('fleet.stateFilter')}>
            {(['all', 'onSite', 'available', 'maintenance'] as const).map((option) => {
              const count = option === 'all' ? machines.length : machines.filter((item) => item.state === option).length
              const isSelected = stateFilter === option
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setStateParam(option === 'all' ? '' : option)}
                  className={
                    isSelected
                      ? 'inline-flex h-9 items-center gap-2 rounded-lg border border-brand bg-accent-tint px-3.5 text-sm font-semibold text-ink ring-1 ring-brand'
                      : 'inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300'
                  }
                >
                  {option !== 'all' && <span className={`size-2 rounded-full ${FLEET_STATES[option].bar}`} aria-hidden="true" />}
                  {option === 'all' ? t('fleet.states.all') : t(`fleet.states.${option}`)}
                  <span className="num text-xs opacity-70">{count}</span>
                </button>
              )
            })}
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {machines
              .filter((item) => stateFilter === 'all' || item.state === stateFilter)
              .map(({ machine, state }, index) => (
                <motion.li
                  key={machine.id}
                  layout
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.05, ease: [0.16, 1, 0.3, 1] }}
                >
                  <MachineCard
                    machine={machine}
                    state={state}
                    outlook={outlookFor(machine.id, reservations, today)}
                    onDelete={publisher ? () => setDeleting(machine) : undefined}
                  />
                </motion.li>
              ))}
          </ul>
          <Pagination pageData={fleet.data} onPageChange={setPage} onSizeChange={setSize} isDisabled={fleet.isLoading} />
        </>
      )}

      <ConfirmDialog
        isOpen={deleting !== null}
        title={t('fleet.deleteTitle')}
        message={t('fleet.deleteMessage', { name: deleting?.name ?? '' })}
        confirmLabel={t('fleet.delete')}
        isLoading={removeMachine.isLoading}
        onConfirm={() => deleting && void removeMachine.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
