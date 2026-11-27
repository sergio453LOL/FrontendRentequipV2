import { BellRing } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RateLine } from '../../components/admin/AdminCharts'
import { AdminPageHeader, Bar, BlockError, Panel, PanelHeader, SourceBadge } from '../../components/admin/AdminUi'
import { Button } from '../../components/common/Button'
import { useAdminQuery } from '../../hooks/useAdminQuery'
import { useToast } from '../../hooks/useToast'
import { currentLocale } from '../../i18n'
import { adminInsightsService } from '../../services/adminInsightsService'
import type { AiTelemetry } from '../../types'
import { formatCount, formatPercent, formatSoles, percentChange, signed } from '../../utils/adminFormat'
import { cn } from '../../utils/cn'
import { parseIsoDate } from '../../utils/format'

function Ranking({ data }: { data: AiTelemetry | null }) {
  const { t } = useTranslation()
  const top = data ? Math.max(...data.topQueries.map((query) => query.count)) : 1
  return (
    <Panel className="lg:col-span-7" aria-labelledby="ranking-title">
      <PanelHeader id="ranking-title" title={t('admin.ai.ranking')} meta={t('admin.ai.rankingMeta')} />
      <div className="hidden grid-cols-[24px_minmax(0,1fr)_64px_72px_80px] gap-x-3 border-y border-slate-200/80 px-5 py-2 text-xs text-slate-500 sm:grid">
        <span aria-hidden="true" />
        <span>{t('admin.ai.columns.query')}</span>
        <span className="text-right">{t('admin.ai.columns.count')}</span>
        <span className="text-right">{t('admin.ai.columns.change')}</span>
        <span className="text-right">{t('admin.ai.columns.conversion')}</span>
      </div>
      <ol className="border-t border-slate-200/80 sm:border-t-0">
        {!data
          ? Array.from({ length: 8 }, (_, index) => (
              <li key={index} className="border-b border-slate-100 px-5 py-3">
                <Bar className="h-4" />
              </li>
            ))
          : data.topQueries.map((query, index) => {
              const change = percentChange(query.count, query.previousCount)
              return (
                <li key={query.query} className="grid grid-cols-[24px_minmax(0,1fr)_auto] gap-x-3 border-b border-slate-100 px-4 py-2.5 last:border-b-0 sm:grid-cols-[24px_minmax(0,1fr)_64px_72px_80px] sm:px-5">
                  <span className="num pt-px text-sm text-slate-500">{index + 1}.</span>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-900">“{query.query}”</p>
                    <span className="mt-1.5 block h-0.5 rounded-full bg-slate-100" aria-hidden="true">
                      <span className={cn('block h-full rounded-full', index === 0 ? 'bg-brand' : 'bg-slate-300')} style={{ width: `${(query.count / top) * 100}%` }} />
                    </span>
                    <p className="num mt-1 text-xs text-slate-500 sm:hidden">
                      {change !== null && signed(formatPercent(Math.abs(change)), change)} · {t('admin.ai.conversionShort', { value: formatPercent(query.conversion) })}
                    </p>
                  </div>
                  <span className="num text-right text-sm font-semibold text-slate-900">{formatCount(query.count)}</span>
                  <span className={cn('num hidden text-right text-sm sm:block', change !== null && change < 0 ? 'text-negative' : 'text-slate-600')}>
                    {change === null ? '—' : signed(formatPercent(Math.abs(change)), change)}
                  </span>
                  <span className="num hidden text-right text-sm text-slate-900 sm:block">{formatPercent(query.conversion)}</span>
                </li>
              )
            })}
      </ol>
    </Panel>
  )
}

function Gaps({ data }: { data: AiTelemetry | null }) {
  const { t } = useTranslation()
  const toast = useToast()
  const gaps = data ? [...data.gaps].sort((a, b) => b.unmetSearches - a.unmetSearches) : null
  const top = gaps ? gaps[0].unmetSearches : 1
  const lost = gaps ? gaps.reduce((sum, gap) => sum + gap.lostRevenue, 0) : 0
  return (
    <Panel className="flex flex-col lg:col-span-5" aria-labelledby="gaps-title">
      <PanelHeader id="gaps-title" title={t('admin.ai.gaps')} meta={gaps ? t('admin.ai.gapsMeta', { amount: formatSoles(lost) }) : undefined} />
      <ul className="flex-1 border-t border-slate-200/80">
        {!gaps
          ? Array.from({ length: 6 }, (_, index) => (
              <li key={index} className="border-b border-slate-100 px-5 py-3">
                <Bar className="h-8" />
              </li>
            ))
          : gaps.map((gap) => (
              <li key={`${gap.city}-${gap.workType}`} className="border-b border-slate-100 px-4 py-2.5 last:border-b-0 sm:px-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-sm">
                    <span className="font-medium text-slate-900">{gap.city}</span>
                    <span className="text-slate-600"> · {t(`admin.workTypes.${gap.workType}`)}</span>
                  </p>
                  <p className="num shrink-0 text-sm font-semibold text-slate-900">
                    {formatCount(gap.unmetSearches)} <span className="text-xs font-normal text-slate-500">{t('admin.ai.unmet')}</span>
                  </p>
                </div>
                <span className="mt-1.5 block h-1 rounded-full bg-slate-100" aria-hidden="true">
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${(gap.unmetSearches / top) * 100}%` }} />
                </span>
                <p className="num mt-1 flex justify-between gap-3 text-xs text-slate-500">
                  <span className={cn(gap.availableUnits === 0 && 'font-medium text-negative')}>{t('admin.ai.units', { count: gap.availableUnits })}</span>
                  <span>{t('admin.ai.lost', { amount: formatSoles(gap.lostRevenue) })}</span>
                </p>
              </li>
            ))}
      </ul>
      <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
        <Button variant="secondary" size="sm" disabled={!gaps} leftIcon={<BellRing className="size-4" />} onClick={() => toast.success(t('admin.ai.notified'))}>
          {t('admin.ai.notifyOwners')}
        </Button>
      </div>
    </Panel>
  )
}

function Effectiveness({ data }: { data: AiTelemetry | null }) {
  const { t } = useTranslation()
  const week = data?.weeks.at(-1)
  const rates = data ? data.weeks.map((item) => (item.booked / item.shown) * 100) : []
  const labels = data ? data.weeks.map((item) => parseIsoDate(item.week).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' })) : []
  const steps = week
    ? [
        { key: 'shown', value: week.shown, rate: null },
        { key: 'clicked', value: week.clicked, rate: (week.clicked / week.shown) * 100 },
        { key: 'booked', value: week.booked, rate: (week.booked / week.clicked) * 100 },
      ] as const
    : null

  return (
    <Panel className="lg:col-span-12" aria-labelledby="effect-title">
      <PanelHeader id="effect-title" title={t('admin.ai.effectiveness')} meta={t('admin.ai.effectivenessMeta')} />
      <div className="grid gap-x-8 gap-y-5 px-4 pb-5 sm:px-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ol className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-slate-200/80 bg-slate-200/80 self-start">
          {(steps ?? [null, null, null]).map((step, index) => (
            <li key={step?.key ?? index} className="bg-white px-3 py-3">
              {step ? (
                <>
                  <p className="text-[13px] text-slate-600">{t(`admin.ai.funnel.${step.key}`)}</p>
                  <p className="num mt-1 text-xl font-semibold text-slate-900">{formatCount(step.value)}</p>
                  <p className="num mt-0.5 text-xs text-slate-500">{step.rate === null ? t('admin.ai.funnel.base') : t('admin.ai.funnel.ofPrevious', { value: formatPercent(step.rate) })}</p>
                </>
              ) : (
                <Bar className="h-14" />
              )}
            </li>
          ))}
        </ol>
        <div className="min-w-0">
          <p className="mb-2 text-xs text-slate-500">{t('admin.ai.weekly')}</p>
          {data ? <RateLine values={rates} labels={labels} label={t('admin.ai.weekly')} height={150} /> : <Bar className="h-[150px]" />}
        </div>
      </div>
    </Panel>
  )
}

export default function AdminAiPage() {
  const { t } = useTranslation()
  const { data, error, reload } = useAdminQuery(adminInsightsService.aiTelemetry)
  const week = data?.weeks.at(-1)
  return (
    <>
      <AdminPageHeader
        title={t('admin.ai.title')}
        subtitle={week ? t('admin.ai.subtitle', { rate: formatPercent((week.booked / week.shown) * 100), booked: formatCount(week.booked) }) : t('common.loading')}
        source={<SourceBadge kind="demo" />}
      />
      {error && (
        <Panel className="mb-4 pt-4">
          <BlockError message={error.message} onRetry={reload} />
        </Panel>
      )}
      <div className="grid gap-4 lg:grid-cols-12">
        <Ranking data={data} />
        <Gaps data={data} />
        <Effectiveness data={data} />
      </div>
    </>
  )
}
