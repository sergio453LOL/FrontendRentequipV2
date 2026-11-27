import { CalendarPlus, Download, Eye, LogIn, MessageSquareText, Repeat2, ShieldCheck, Sparkles, Upload, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminPageHeader, Bar, BlockError, EmptyBlock, Panel, Segmented, SelectField, SourceBadge } from '../../components/admin/AdminUi'
import { Button } from '../../components/common/Button'
import { useAdminQuery } from '../../hooks/useAdminQuery'
import { useToast } from '../../hooks/useToast'
import { currentLocale } from '../../i18n'
import { adminInsightsService } from '../../services/adminInsightsService'
import type { AuditEvent, AuditEventType } from '../../types'
import { downloadCsv, formatCount, formatDateTime, formatSoles, formatTime } from '../../utils/adminFormat'
import { cn } from '../../utils/cn'
import { parseIsoDate, todayIso, toIsoDate } from '../../utils/format'

const TYPES: AuditEventType[] = ['RESERVATION_CREATED', 'ESCROW_PAYMENT', 'AI_QUERY', 'EQUIPMENT_PUBLISHED', 'STATUS_CHANGED', 'REVIEW', 'LOGIN']
const PAGE = 50

/** One look per kind of event: its icon and a tint, so a payment reads apart from a login at a glance. */
const TYPE_STYLE: Record<AuditEventType, { icon: LucideIcon; className: string }> = {
  RESERVATION_CREATED: { icon: CalendarPlus, className: 'bg-blue-50 text-blue-800' },
  ESCROW_PAYMENT: { icon: ShieldCheck, className: 'bg-emerald-50 text-emerald-800' },
  AI_QUERY: { icon: Sparkles, className: 'bg-amber-50 text-amber-800' },
  EQUIPMENT_PUBLISHED: { icon: Upload, className: 'bg-orange-50 text-action-ink' },
  STATUS_CHANGED: { icon: Repeat2, className: 'bg-slate-100 text-slate-700' },
  REVIEW: { icon: MessageSquareText, className: 'bg-slate-100 text-slate-700' },
  LOGIN: { icon: LogIn, className: 'bg-slate-100 text-slate-700' },
}

function TypeBadge({ type }: { type: AuditEventType }) {
  const { t } = useTranslation()
  const { icon: Icon, className } = TYPE_STYLE[type]
  return (
    <span className={cn('inline-flex h-[22px] flex-none items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap', className)}>
      <Icon className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
      {t(`admin.movements.types.${type}`)}
    </span>
  )
}

function dayHeading(date: string, t: (key: 'admin.movements.today' | 'admin.movements.yesterday') => string): string {
  const today = todayIso()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (date === today) return t('admin.movements.today')
  if (date === toIsoDate(yesterday)) return t('admin.movements.yesterday')
  return parseIsoDate(date).toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' })
}

function Timeline({ events }: { events: AuditEvent[] }) {
  const { t } = useTranslation()
  const days = useMemo(() => {
    const groups = new Map<string, AuditEvent[]>()
    for (const event of events) {
      const day = event.at.slice(0, 10)
      groups.set(day, [...(groups.get(day) ?? []), event])
    }
    return [...groups.entries()]
  }, [events])

  return (
    <div className="px-4 pb-4 sm:px-5">
      {days.map(([day, items]) => (
        <section key={day} className="mt-2 first:mt-0" aria-label={dayHeading(day, t)}>
          <h3 className="sticky top-14 z-[1] bg-white py-2 text-xs font-semibold text-slate-600 first-letter:uppercase">
            {dayHeading(day, t)} <span className="num font-normal text-slate-500">· {formatCount(items.length)}</span>
          </h3>
          <ol className="relative ml-[7px] border-l border-slate-200">
            {items.map((event) => {
              const Icon = TYPE_STYLE[event.type].icon
              return (
                <li key={event.id} className="relative pb-3 pl-5 last:pb-1">
                  <span className="absolute top-1 -left-[8px] flex size-[15px] items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
                    <Icon className="size-2.5 text-slate-500" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <time dateTime={event.at} className="num w-11 shrink-0 text-xs text-slate-500">
                      {formatTime(event.at)}
                    </time>
                    <TypeBadge type={event.type} />
                    <span className="min-w-0 truncate text-sm font-medium text-slate-900">{event.company}</span>
                    {event.amount !== null && <span className="num ml-auto shrink-0 text-sm font-semibold text-slate-900">{formatSoles(event.amount)}</span>}
                  </div>
                  <p className="mt-0.5 text-[13px] text-slate-600 sm:pl-[52px]">
                    {event.detail} <span className="text-slate-500">· {event.actor}</span>
                  </p>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}

function EventTable({ events }: { events: AuditEvent[] }) {
  const { t } = useTranslation()
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-y border-slate-200/80 text-left text-xs text-slate-500">
            <th scope="col" className="py-2 pr-3 pl-5 font-medium">{t('admin.movements.columns.when')}</th>
            <th scope="col" className="px-3 py-2 font-medium">{t('admin.movements.columns.type')}</th>
            <th scope="col" className="px-3 py-2 font-medium">{t('admin.movements.columns.company')}</th>
            <th scope="col" className="px-3 py-2 font-medium">{t('admin.movements.columns.detail')}</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">{t('admin.movements.columns.amount')}</th>
            <th scope="col" className="py-2 pr-5 pl-3 text-right font-medium">{t('admin.movements.columns.ip')}</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-slate-100 align-top hover:bg-slate-50">
              <td className="num py-2.5 pr-3 pl-5 whitespace-nowrap text-slate-600">{formatDateTime(event.at)}</td>
              <td className="px-3 py-2.5">
                <TypeBadge type={event.type} />
              </td>
              <td className="max-w-[220px] px-3 py-2.5">
                <span className="block truncate font-medium text-slate-900">{event.company}</span>
                <span className="block truncate text-xs text-slate-500">{event.actor}</span>
              </td>
              <td className="max-w-[360px] px-3 py-2.5 text-slate-700">{event.detail}</td>
              <td className="num px-3 py-2.5 text-right whitespace-nowrap text-slate-900">{event.amount !== null ? formatSoles(event.amount) : <span className="text-slate-400">—</span>}</td>
              <td className="num py-2.5 pr-5 pl-3 text-right text-xs whitespace-nowrap text-slate-500">{event.ip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminMovementsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data, error, isLoading, reload } = useAdminQuery(adminInsightsService.events)
  const [view, setView] = useState<'timeline' | 'table'>('timeline')
  const [type, setType] = useState<AuditEventType | 'all'>('all')
  const [company, setCompany] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const events = useMemo(() => data ?? [], [data])
  const companies = useMemo(() => [...new Set(events.map((event) => event.company))].sort((a, b) => a.localeCompare(b)), [events])
  const filtered = events.filter((event) => {
    const day = event.at.slice(0, 10)
    return (type === 'all' || event.type === type) && (company === 'all' || event.company === company) && (!from || day >= from) && (!to || day <= to)
  })
  const oldest = events.at(-1)?.at
  const hasFilters = type !== 'all' || company !== 'all' || from !== '' || to !== ''

  function exportCsv() {
    downloadCsv(
      `rentequip-movimientos-${todayIso()}.csv`,
      [t('admin.movements.columns.when'), t('admin.movements.columns.type'), t('admin.movements.columns.company'), t('admin.movements.columns.actor'), t('admin.movements.columns.detail'), t('admin.movements.columns.amount'), t('admin.movements.columns.ip')],
      filtered.map((event) => [event.at.replace('T', ' '), t(`admin.movements.types.${event.type}`), event.company, event.actor, event.detail, event.amount, event.ip]),
    )
    toast.success(t('admin.movements.exported', { count: filtered.length }))
  }

  const dateField = 'h-9 min-w-0 flex-1 sm:flex-none rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-800 focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none'

  return (
    <>
      <AdminPageHeader
        title={t('admin.movements.title')}
        subtitle={oldest ? t('admin.movements.subtitle', { count: events.length, formatted: formatCount(events.length), date: formatDateTime(oldest) }) : t('common.loading')}
        source={<SourceBadge kind="demo" />}
        actions={
          <Button variant="secondary" leftIcon={<Download className="size-4" />} onClick={exportCsv} disabled={!data || filtered.length === 0}>
            {t('admin.movements.export')}
          </Button>
        }
      />
      <Panel>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
          <SelectField
            id="movements-type"
            label={t('admin.movements.columns.type')}
            value={type}
            onChange={(value) => { setType(value); setLimit(PAGE) }}
            options={[{ value: 'all', label: t('admin.movements.allTypes') }, ...TYPES.map((value) => ({ value, label: t(`admin.movements.types.${value}`) }))]}
            className="w-full sm:w-48"
          />
          <SelectField
            id="movements-company"
            label={t('admin.movements.columns.company')}
            value={company}
            onChange={(value) => { setCompany(value); setLimit(PAGE) }}
            options={[{ value: 'all', label: t('admin.movements.allCompanies') }, ...companies.map((name) => ({ value: name, label: name }))]}
            className="w-full sm:w-60"
          />
          <label className="flex flex-1 items-center gap-1.5 text-[13px] text-slate-600 sm:flex-none">
            {t('admin.movements.from')}
            <input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className={dateField} />
          </label>
          <label className="flex flex-1 items-center gap-1.5 text-[13px] text-slate-600 sm:flex-none">
            {t('admin.movements.to')}
            <input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className={dateField} />
          </label>
          {hasFilters && (
            <button
              type="button"
              onClick={() => { setType('all'); setCompany('all'); setFrom(''); setTo('') }}
              className="h-9 px-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {t('admin.common.clearFilters')}
            </button>
          )}
          <Segmented
            layoutId="movements-view"
            label={t('admin.movements.viewLabel')}
            value={view}
            onChange={setView}
            options={[
              { value: 'timeline', label: t('admin.movements.views.timeline') },
              { value: 'table', label: t('admin.movements.views.table') },
            ]}
            className="ml-auto"
          />
        </div>
        {error && <BlockError message={error.message} onRetry={reload} />}
        {isLoading && !data ? (
          <div className="space-y-2 px-4 pb-4 sm:px-5">
            {Array.from({ length: 10 }, (_, index) => (
              <Bar key={index} className="h-9" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyBlock>{t('admin.movements.empty')}</EmptyBlock>
        ) : view === 'timeline' ? (
          <Timeline events={filtered.slice(0, limit)} />
        ) : (
          <EventTable events={filtered.slice(0, limit)} />
        )}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
            <span className="num flex items-center gap-1.5 text-[13px] text-slate-500">
              <Eye className="size-3.5" aria-hidden="true" />
              {t('admin.common.showing', { shown: Math.min(limit, filtered.length), total: filtered.length })}
            </span>
            {filtered.length > limit && (
              <Button variant="secondary" size="sm" onClick={() => setLimit((value) => value + PAGE)}>
                {t('admin.common.showMore')}
              </Button>
            )}
          </div>
        )}
      </Panel>
    </>
  )
}
