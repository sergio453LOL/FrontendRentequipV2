import { useTranslation } from 'react-i18next'
import { ColumnChart } from '../../components/admin/AdminCharts'
import { AdminPageHeader, Bar, BlockError, Panel, PanelHeader, Pill, SourceBadge, type PillTone } from '../../components/admin/AdminUi'
import { useAdminQuery } from '../../hooks/useAdminQuery'
import { currentLocale } from '../../i18n'
import { adminInsightsService } from '../../services/adminInsightsService'
import type { EscrowStatus, Payout, PayoutStatus } from '../../types'
import { formatPercent, formatSoles, formatSolesCompact, formatSolesExact } from '../../utils/adminFormat'
import { cn } from '../../utils/cn'
import { formatDate, parseIsoDate } from '../../utils/format'

const ESCROW_TONES: Record<EscrowStatus, PillTone> = { HELD: 'amber', RELEASE_SCHEDULED: 'blue', DISPUTED: 'red' }
const PAYOUT_TONES: Record<PayoutStatus, PillTone> = { PAID: 'green', PROCESSING: 'blue', SCHEDULED: 'slate', ON_HOLD: 'red' }

const net = (payout: Payout) => payout.gross - payout.commission

function Figure({ label, value, note, className }: { label: string; value: string | null; note?: string; className?: string }) {
  return (
    <div className={cn('min-w-0 px-4 py-4 sm:px-5', className)}>
      <p className="truncate text-[13px] font-medium text-slate-600">{label}</p>
      {value === null ? <Bar className="mt-2 h-7 w-28" /> : <p className="num mt-1.5 text-[22px] leading-7 font-semibold text-slate-900 sm:text-[26px] sm:leading-8">{value}</p>}
      {note && <p className="mt-1 truncate text-xs text-slate-500">{note}</p>}
    </div>
  )
}

export default function AdminFinancePage() {
  const { t } = useTranslation()
  const { data, error, reload } = useAdminQuery(adminInsightsService.finance)
  const held = data ? data.escrow.reduce((sum, hold) => sum + hold.rental + hold.deposit, 0) : null
  const deposits = data ? data.escrow.reduce((sum, hold) => sum + hold.deposit, 0) : 0
  const thisMonth = data?.monthlyCommission.at(-1)
  const lastMonth = data?.monthlyCommission.at(-2)
  const toPay = data ? data.payouts.filter((payout) => payout.status !== 'PAID') : []
  const paid = data ? data.payouts.filter((payout) => payout.status === 'PAID') : []
  const disputed = data ? data.escrow.filter((hold) => hold.status === 'DISPUTED').length : 0

  return (
    <>
      <AdminPageHeader
        title={t('admin.finance.title')}
        subtitle={held !== null ? t('admin.finance.subtitle', { amount: formatSoles(held), count: data?.escrow.length ?? 0, disputed }) : t('common.loading')}
        source={<SourceBadge kind="demo" />}
      />
      {error && (
        <Panel className="mb-4 pt-4">
          <BlockError message={error.message} onRetry={reload} />
        </Panel>
      )}

      <Panel className="grid grid-cols-2 lg:grid-cols-4">
        <Figure label={t('admin.finance.held')} value={held !== null ? formatSoles(held) : null} note={t('admin.finance.heldNote', { amount: formatSoles(deposits) })} />
        <Figure
          label={t('admin.finance.commissionMonth')}
          value={thisMonth ? formatSoles(thisMonth.amount) : null}
          note={data ? t('admin.finance.commissionNote', { rate: formatPercent(data.commissionRate * 100, 0) }) : undefined}
          className="border-l border-slate-200/80"
        />
        <Figure
          label={t('admin.finance.toPay')}
          value={data ? formatSoles(toPay.reduce((sum, payout) => sum + net(payout), 0)) : null}
          note={t('admin.finance.payoutsCount', { count: toPay.length })}
          className="border-t border-slate-200/80 lg:border-t-0 lg:border-l"
        />
        <Figure
          label={t('admin.finance.paid')}
          value={data ? formatSoles(paid.reduce((sum, payout) => sum + net(payout), 0)) : null}
          note={t('admin.finance.payoutsCount', { count: paid.length })}
          className="border-t border-l border-slate-200/80 lg:border-t-0"
        />
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-8" aria-labelledby="escrow-title">
          <PanelHeader id="escrow-title" title={t('admin.finance.escrowTitle')} meta={t('admin.finance.escrowMeta')} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-y border-slate-200/80 text-left text-xs text-slate-500">
                  <th scope="col" className="py-2 pr-3 pl-5 font-medium">{t('admin.finance.columns.reservation')}</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">{t('admin.finance.columns.rental')}</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">{t('admin.finance.columns.deposit')}</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">{t('admin.finance.columns.release')}</th>
                  <th scope="col" className="py-2 pr-5 pl-3 font-medium">{t('admin.finance.columns.status')}</th>
                </tr>
              </thead>
              <tbody>
                {!data
                  ? Array.from({ length: 6 }, (_, index) => (
                      <tr key={index}>
                        <td colSpan={5} className="px-5 py-2">
                          <Bar className="h-8" />
                        </td>
                      </tr>
                    ))
                  : data.escrow.map((hold) => (
                      <tr key={hold.code} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                        <td className="max-w-[260px] py-2.5 pr-3 pl-5">
                          <p className="truncate font-medium text-slate-900">
                            <span className="num">{hold.code}</span> · {hold.equipment}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {hold.renter} → {hold.owner}
                          </p>
                        </td>
                        <td className="num px-3 py-2.5 text-right whitespace-nowrap text-slate-900">{formatSoles(hold.rental)}</td>
                        <td className="num px-3 py-2.5 text-right whitespace-nowrap text-slate-700">{formatSoles(hold.deposit)}</td>
                        <td className="num px-3 py-2.5 text-right whitespace-nowrap text-slate-700">{formatDate(hold.releaseOn)}</td>
                        <td className="py-2.5 pr-5 pl-3">
                          <Pill tone={ESCROW_TONES[hold.status]}>{t(`admin.finance.escrowStatus.${hold.status}`)}</Pill>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="flex flex-col lg:col-span-4" aria-labelledby="commission-title">
          <PanelHeader
            id="commission-title"
            title={t('admin.finance.monthly')}
            meta={
              thisMonth && lastMonth
                ? t('admin.finance.monthlyMeta', { change: `${thisMonth.amount >= lastMonth.amount ? '+' : '−'}${formatPercent((Math.abs(thisMonth.amount - lastMonth.amount) / lastMonth.amount) * 100)}` })
                : undefined
            }
          />
          <div className="flex-1 px-4 pb-4 sm:px-5">
            {data ? (
              <ColumnChart
                height={220}
                label={t('admin.finance.monthly')}
                formatValue={(value) => (value === 0 ? '0' : formatSolesCompact(value).replace('S/ ', ''))}
                muted={(_, index) => index < data.monthlyCommission.length - 1}
                data={data.monthlyCommission.map((month) => {
                  const label = parseIsoDate(month.month).toLocaleDateString(currentLocale(), { month: 'short' })
                  return { label: `${label} · ${formatSoles(month.amount)}`, tick: label, value: month.amount }
                })}
              />
            ) : (
              <Bar className="h-[220px]" />
            )}
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" aria-labelledby="payouts-title">
        <PanelHeader id="payouts-title" title={t('admin.finance.payoutsTitle')} meta={data ? t('admin.finance.payoutsMeta', { rate: formatPercent(data.commissionRate * 100, 0) }) : undefined} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-y border-slate-200/80 text-left text-xs text-slate-500">
                <th scope="col" className="py-2 pr-3 pl-5 font-medium">{t('admin.finance.columns.owner')}</th>
                <th scope="col" className="px-3 py-2 font-medium">{t('admin.finance.columns.bank')}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{t('admin.finance.columns.gross')}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{t('admin.finance.columns.commission')}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{t('admin.finance.columns.net')}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{t('admin.finance.columns.date')}</th>
                <th scope="col" className="py-2 pr-5 pl-3 font-medium">{t('admin.finance.columns.status')}</th>
              </tr>
            </thead>
            <tbody>
              {!data
                ? Array.from({ length: 5 }, (_, index) => (
                    <tr key={index}>
                      <td colSpan={7} className="px-5 py-2">
                        <Bar className="h-8" />
                      </td>
                    </tr>
                  ))
                : data.payouts.map((payout) => (
                    <tr key={payout.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                      <td className="py-2.5 pr-3 pl-5">
                        <p className="font-medium text-slate-900">{payout.owner}</p>
                        <p className="num text-xs text-slate-500">{payout.id}</p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{payout.bank}</td>
                      <td className="num px-3 py-2.5 text-right whitespace-nowrap text-slate-700">{formatSolesExact(payout.gross)}</td>
                      <td className="num px-3 py-2.5 text-right whitespace-nowrap text-slate-700">−{formatSolesExact(payout.commission)}</td>
                      <td className="num px-3 py-2.5 text-right font-semibold whitespace-nowrap text-slate-900">{formatSolesExact(net(payout))}</td>
                      <td className="num px-3 py-2.5 text-right whitespace-nowrap text-slate-700">{formatDate(payout.date)}</td>
                      <td className="py-2.5 pr-5 pl-3">
                        <Pill tone={PAYOUT_TONES[payout.status]}>{t(`admin.finance.payoutStatus.${payout.status}`)}</Pill>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}
