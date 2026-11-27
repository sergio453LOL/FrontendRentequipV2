import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, FileWarning, Landmark, SearchX, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ColumnChart, Sparkline, type ColumnDatum } from '../../components/admin/AdminCharts'
import { AdminPageHeader, Bar, BlockError, Panel, PanelHeader, Pill, Segmented, SourceBadge, type PillTone } from '../../components/admin/AdminUi'
import { currentLocale } from '../../i18n'
import { useAdminQuery } from '../../hooks/useAdminQuery'
import { PATHS } from '../../routes/paths'
import { adminInsightsService } from '../../services/adminInsightsService'
import type { AdminAlertKind, AdminKpi, AdminWorkType, DailyRentals, LiveBooking, LiveBookingStage } from '../../types'
import { formatCount, formatPercent, formatSoles, formatTime, percentChange, signed } from '../../utils/adminFormat'
import { cn } from '../../utils/cn'
import { parseIsoDate } from '../../utils/format'
import { timeAgo } from '../../utils/timeAgo'

const WORK_TYPES: AdminWorkType[] = ['earthworks', 'lifting', 'compaction', 'manual']
type Period = '7' | '30' | '90'

function KpiValue({ kpi }: { kpi: AdminKpi }) {
  if (kpi.unit === 'PEN') return <>{formatSoles(kpi.value)}</>
  if (kpi.unit === 'percent') return <>{formatPercent(kpi.value)}</>
  return <>{formatCount(kpi.value)}</>
}

/** The change in words: relative for money and counts, in points for a rate. Every KPI here is better when it rises. */
function KpiDelta({ kpi }: { kpi: AdminKpi }) {
  const { t } = useTranslation()
  const difference = kpi.value - kpi.previous
  const text =
    kpi.unit === 'percent'
      ? signed(t('admin.dashboard.points', { value: Math.abs(difference).toFixed(1) }), difference)
      : (() => {
          const change = percentChange(kpi.value, kpi.previous)
          return change === null ? '—' : signed(formatPercent(Math.abs(change)), change)
        })()
  return (
    <p className="mt-1 text-xs text-slate-500">
      <span className={cn('num font-semibold', difference > 0 ? 'text-positive' : difference < 0 ? 'text-negative' : 'text-slate-500')}>{text}</span>{' '}
      {t('admin.dashboard.vsPrevious')}
    </p>
  )
}

function KpiStrip({ kpis }: { kpis: AdminKpi[] | null }) {
  const { t } = useTranslation()
  const ids = ['gmv', 'activeRentals', 'verifiedCompanies', 'aiConversion'] as const
  return (
    <Panel className="grid grid-cols-2 lg:grid-cols-4" aria-labelledby="kpi-title">
      <h2 id="kpi-title" className="sr-only">
        {t('admin.dashboard.kpiTitle')}
      </h2>
      {ids.map((id, index) => {
        const kpi = kpis?.find((item) => item.id === id)
        return (
          <div
            key={id}
            className={cn(
              'min-w-0 px-4 py-4 sm:px-5',
              index % 2 === 1 && 'border-l border-slate-200/80',
              index >= 2 && 'border-t border-slate-200/80 lg:border-t-0',
              index === 2 && 'lg:border-l',
            )}
          >
            <p className="text-[13px] leading-5 font-medium text-slate-600">{t(`admin.dashboard.kpis.${id}`)}</p>
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                {kpi ? (
                  <>
                    <p className="num mt-1.5 text-[22px] leading-7 font-semibold tracking-[-0.01em] text-slate-900 sm:text-[26px] sm:leading-8">
                      <KpiValue kpi={kpi} />
                    </p>
                    <KpiDelta kpi={kpi} />
                  </>
                ) : (
                  <>
                    <Bar className="mt-2 h-7 w-28" />
                    <Bar className="mt-2 h-3 w-24" />
                  </>
                )}
              </div>
              {kpi && <Sparkline values={kpi.series} className="mb-5 hidden shrink-0 sm:block" />}
            </div>
          </div>
        )
      })}
    </Panel>
  )
}

function dayTick(date: string, period: Period, index: number, length: number): string | undefined {
  const locale = currentLocale()
  const parsed = parseIsoDate(date)
  if (period === '7') return parsed.toLocaleDateString(locale, { weekday: 'short' })
  const every = period === '30' ? 7 : 15
  // Count back from today so the last column always carries a label.
  return (length - 1 - index) % every === 0 ? parsed.toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : undefined
}

function RentalsByCategory({ days }: { days: DailyRentals[] | null }) {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<Period>('30')
  const [focus, setFocus] = useState<AdminWorkType | 'all'>('all')
  const range = useMemo(() => (days ? days.slice(-Number(period)) : []), [days, period])
  const totals = WORK_TYPES.map((type) => ({ type, total: range.reduce((sum, day) => sum + day[type], 0) })).sort((a, b) => b.total - a.total)
  const total = totals.reduce((sum, item) => sum + item.total, 0)
  const largest = Math.max(...totals.map((item) => item.total), 1)
  const columns: ColumnDatum[] = range.map((day, index) => ({
    label: parseIsoDate(day.date).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' }),
    tick: dayTick(day.date, period, index, range.length),
    value: focus === 'all' ? WORK_TYPES.reduce((sum, type) => sum + day[type], 0) : day[focus],
  }))
  const focusLabel = focus === 'all' ? t('admin.dashboard.allCategories') : t(`admin.workTypes.${focus}`)

  return (
    <Panel aria-labelledby="rentals-title">
      <PanelHeader
        id="rentals-title"
        title={t('admin.dashboard.rentalsTitle')}
        meta={days ? t('admin.dashboard.rentalsMeta', { count: total, formatted: formatCount(total), days: Number(period) }) : undefined}
        actions={
          <Segmented
            layoutId="rentals-period"
            label={t('admin.periods.label')}
            value={period}
            onChange={setPeriod}
            options={[
              { value: '7', label: t('admin.periods.d7') },
              { value: '30', label: t('admin.periods.d30') },
              { value: '90', label: t('admin.periods.d90') },
            ]}
          />
        }
      />
      {!days ? (
        <div className="grid gap-4 px-4 pb-5 sm:px-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="space-y-3">
            {WORK_TYPES.map((type) => (
              <Bar key={type} className="h-9" />
            ))}
          </div>
          <Bar className="h-[180px]" />
        </div>
      ) : (
        <div className="grid gap-x-6 gap-y-4 px-4 pb-4 sm:px-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <ul className="flex flex-col gap-0.5" aria-label={t('admin.dashboard.byCategory')}>
            {totals.map((item) => {
              const isFocused = focus === item.type
              return (
                <li key={item.type}>
                  <button
                    type="button"
                    aria-pressed={isFocused}
                    onClick={() => setFocus(isFocused ? 'all' : item.type)}
                    className={cn(
                      'w-full rounded-md px-2.5 py-2 text-left transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-brand',
                      isFocused ? 'bg-slate-100' : 'hover:bg-slate-50',
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <span className={cn('truncate', isFocused ? 'font-semibold text-slate-900' : 'text-slate-700')}>{t(`admin.workTypes.${item.type}`)}</span>
                      <span className="num shrink-0 font-semibold text-slate-900">
                        {formatCount(item.total)}
                        <span className="ml-1.5 text-xs font-normal text-slate-500">{total ? formatPercent((item.total / total) * 100, 0) : '—'}</span>
                      </span>
                    </span>
                    <span className="mt-1.5 block h-1.5 rounded-full bg-slate-100">
                      <motion.span
                        className={cn('block h-full rounded-full', focus === 'all' || isFocused ? 'bg-brand' : 'bg-slate-300')}
                        initial={false}
                        animate={{ width: `${(item.total / largest) * 100}%` }}
                        transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                      />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="min-w-0">
            <p className="mb-2 text-xs text-slate-500">{t('admin.dashboard.dailyOf', { name: focusLabel })}</p>
            <ColumnChart data={columns} label={t('admin.dashboard.dailyOf', { name: focusLabel })} height={188} formatValue={(value) => formatCount(value)} />
          </div>
        </div>
      )}
    </Panel>
  )
}

const ALERTS: Record<AdminAlertKind, { icon: LucideIcon; to: string }> = {
  KYB_PENDING: { icon: BadgeCheck, to: `${PATHS.adminCompanies}?tab=pending` },
  ABANDONED_QUOTES: { icon: FileWarning, to: `${PATHS.adminMarketing}?tab=quotes` },
  DEMAND_GAP: { icon: SearchX, to: PATHS.adminAi },
  PAYOUT_ON_HOLD: { icon: Landmark, to: PATHS.adminFinance },
}

function Alerts({ alerts }: { alerts: { kind: AdminAlertKind; count: number; amount: number | null; detail: string | null }[] | null }) {
  const { t } = useTranslation()
  return (
    <Panel aria-labelledby="alerts-title">
      <PanelHeader id="alerts-title" title={t('admin.dashboard.alertsTitle')} />
      <ul className="grid gap-px overflow-hidden rounded-b-lg border-t border-slate-200/80 bg-slate-200/80 sm:grid-cols-2">
        {(alerts ?? Array.from({ length: 4 }, () => null)).map((alert, index) => {
          if (!alert) {
            return (
              <li key={index} className="bg-white px-4 py-3.5 sm:px-5">
                <Bar className="h-4 w-3/4" />
                <Bar className="mt-2 h-3 w-1/3" />
              </li>
            )
          }
          const { icon: Icon, to } = ALERTS[alert.kind]
          return (
            <li key={alert.kind} className="bg-white">
              <Link to={to} className="group flex h-full items-start gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand sm:px-5">
                <Icon className="mt-0.5 size-4 shrink-0 text-slate-500" strokeWidth={1.75} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900">
                    {t(`admin.dashboard.alerts.${alert.kind}`, { count: alert.count, detail: alert.detail ?? '' })}
                  </span>
                  <span className="num mt-0.5 block text-xs text-slate-500">
                    {alert.amount !== null ? t('admin.dashboard.atStake', { amount: formatSoles(alert.amount) }) : t('admin.dashboard.waiting')}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-action-ink">
                  {t(`admin.dashboard.alertActions.${alert.kind}`)}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

const STAGE_TONES: Record<LiveBookingStage, PillTone> = { REQUESTED: 'amber', PAID: 'green', ON_SITE: 'blue' }
const FEED_SIZE = 8
const FEED_TICK_MS = 9_000

/** Bookings that "arrive" while the screen is open, cycled from the demo data, newest first. */
function useLiveFeed(initial: LiveBooking[] | null): LiveBooking[] {
  const [extra, setExtra] = useState<LiveBooking[]>([])
  useEffect(() => {
    if (!initial || initial.length === 0) return
    let tick = 0
    const timer = setInterval(() => {
      const source = initial[(initial.length - 1 - (tick % initial.length) + initial.length) % initial.length]
      tick += 1
      const now = new Date()
      const pad = (value: number) => String(value).padStart(2, '0')
      const at = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      setExtra((current) => [{ ...source, id: `${source.id}-live-${tick}`, stage: 'REQUESTED' as const, at }, ...current].slice(0, FEED_SIZE))
    }, FEED_TICK_MS)
    return () => clearInterval(timer)
  }, [initial])
  return [...extra, ...(initial ?? [])].slice(0, FEED_SIZE)
}

function LiveFeed({ bookings }: { bookings: LiveBooking[] | null }) {
  const { t } = useTranslation()
  const feed = useLiveFeed(bookings)
  return (
    <Panel className="flex max-h-[560px] flex-col lg:absolute lg:inset-0 lg:max-h-none" aria-labelledby="live-title">
      <PanelHeader
        id="live-title"
        title={t('admin.dashboard.liveTitle')}
        actions={
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-status-green opacity-60 [animation-duration:2s] motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-status-green" />
            </span>
            {t('admin.dashboard.live')}
          </span>
        }
      />
      <ol className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-b-lg border-t border-slate-100" aria-live="polite">
        {!bookings
          ? Array.from({ length: 6 }, (_, index) => (
              <li key={index} className="border-b border-slate-100 px-4 py-3 sm:px-5">
                <Bar className="h-4 w-2/3" />
                <Bar className="mt-2 h-3 w-1/2" />
              </li>
            ))
          : (
            <AnimatePresence initial={false}>
              {feed.map((booking) => (
                <motion.li
                  key={booking.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="border-b border-slate-100 px-4 py-2.5 last:border-b-0 sm:px-5"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium text-slate-900" title={booking.company}>
                      {booking.company}
                    </p>
                    <p className="num shrink-0 text-sm font-semibold text-slate-900">{formatSoles(booking.amount)}</p>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-slate-600" title={booking.equipment}>
                    {booking.equipment} · {t('common.day', { count: booking.days })}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-700">{booking.city}</span>
                    <Pill tone={STAGE_TONES[booking.stage]}>{t(`admin.dashboard.stages.${booking.stage}`)}</Pill>
                    <time dateTime={booking.at} title={formatTime(booking.at)} className="ml-auto text-xs text-slate-500">
                      {timeAgo(booking.at)}
                    </time>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          )}
      </ol>
    </Panel>
  )
}

export default function AdminDashboardPage() {
  const { t } = useTranslation()
  const { data, error, reload } = useAdminQuery(adminInsightsService.dashboard)
  const gmv = data?.kpis.find((kpi) => kpi.id === 'gmv')
  const change = gmv ? percentChange(gmv.value, gmv.previous) : null

  return (
    <>
      <AdminPageHeader
        title={t('admin.dashboard.title')}
        subtitle={
          gmv && change !== null
            ? t('admin.dashboard.subtitle', { amount: formatSoles(gmv.value), change: signed(formatPercent(Math.abs(change)), change) })
            : t('admin.dashboard.subtitleLoading')
        }
        source={<SourceBadge kind="demo" />}
      />
      {error && (
        <Panel className="mb-4 pt-4">
          <BlockError message={error.message} onRetry={reload} />
        </Panel>
      )}
      <KpiStrip kpis={data?.kpis ?? null} />
      {/* Left: the month by category and what needs attention. Right: the live feed, as tall as the left column. */}
      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-8">
          <RentalsByCategory days={data?.dailyRentals ?? null} />
          <Alerts alerts={data?.alerts ?? null} />
        </div>
        <div className="relative min-w-0 lg:col-span-4">
          <LiveFeed bookings={data?.liveBookings ?? null} />
        </div>
      </div>
    </>
  )
}
