import { BadgeCheck, Ban, FileText, RotateCcw, ShieldOff, Star, Undo2 } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { AdminPageHeader, Bar, BlockError, DemoMark, Drawer, EmptyBlock, Panel, Pill, SearchField, Segmented, SelectField, SourceBadge, type PillTone } from '../../components/admin/AdminUi'
import { Button } from '../../components/common/Button'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { useAdminQuery } from '../../hooks/useAdminQuery'
import { useToast } from '../../hooks/useToast'
import { adminCompanyService, type AdminCompanyDirectory } from '../../services/adminCompanyService'
import type { AdminCompany, CompanyRepresentative, KybDocumentStatus, KybStatus } from '../../types'
import { formatCount, formatSoles } from '../../utils/adminFormat'
import { ApiError } from '../../utils/apiError'
import { cn } from '../../utils/cn'
import { formatDate, formatDateRange } from '../../utils/format'

type Tab = 'all' | 'renters' | 'owners' | 'pending'
const TABS: Tab[] = ['all', 'renters', 'owners', 'pending']
const PAGE = 25

const STATUS_TONES: Record<KybStatus, PillTone> = { VERIFIED: 'green', IN_REVIEW: 'amber', SUSPENDED: 'red' }
const DOC_TONES: Record<KybDocumentStatus, PillTone> = { APPROVED: 'green', PENDING: 'amber', MISSING: 'slate', REJECTED: 'red' }

const isTab = (value: string | null): value is Tab => TABS.includes(value as Tab)

function matchesTab(company: AdminCompany, tab: Tab): boolean {
  if (tab === 'renters') return company.side !== 'OWNER'
  if (tab === 'owners') return company.side !== 'RENTER'
  if (tab === 'pending') return company.status === 'IN_REVIEW'
  return true
}

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function Rating({ company }: { company: AdminCompany }) {
  if (company.rating === null) return <span className="text-slate-400">—</span>
  return (
    <span className="num inline-flex items-center gap-1">
      <Star className="size-3.5 fill-brand text-brand" aria-hidden="true" />
      {company.rating.toFixed(1)}
      <span className="text-xs text-slate-500">({company.reviewCount})</span>
    </span>
  )
}

function CompanyDrawer({
  company: selected,
  onClose,
  onChange,
}: {
  company: AdminCompany | null
  onClose: () => void
  onChange: (key: string, patch: Partial<AdminCompany>) => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  // Keeps the last company on screen while the drawer slides out.
  const [last, setLast] = useState(selected)
  if (selected && selected !== last) setLast(selected)
  const company = selected ?? last
  const [busy, setBusy] = useState<'approve' | 'revoke' | null>(null)
  const [confirmSuspend, setConfirmSuspend] = useState(false)
  const [representative, setRepresentative] = useState<{ key: string; value: CompanyRepresentative | null; failed: boolean } | null>(null)

  // Backend rows fetch their representative (the company's first ADMIN) when the drawer opens.
  const backendId = company?.source === 'api' ? company.backendId : null
  const companyKey = company?.key
  useEffect(() => {
    if (backendId === null || !companyKey) return
    let isCurrent = true
    adminCompanyService
      .representative(backendId)
      .then((value) => isCurrent && setRepresentative({ key: companyKey, value, failed: false }))
      .catch(() => isCurrent && setRepresentative({ key: companyKey, value: null, failed: true }))
    return () => {
      isCurrent = false
    }
  }, [backendId, companyKey])

  if (!company) return null

  const rep = company.source === 'demo' ? company.representative : representative?.key === company.key ? representative.value : undefined
  const repFailed = representative?.key === company.key && representative.failed
  const name = company.name

  async function changeBadge(action: 'approve' | 'revoke') {
    if (!company) return
    if (company.source === 'demo' || company.backendId === null) {
      onChange(company.key, {
        status: action === 'approve' ? 'VERIFIED' : 'IN_REVIEW',
        // Approving signs off every document on file; a missing one stays missing.
        documents:
          action === 'approve'
            ? company.documents.map((document) => (document.status === 'MISSING' ? document : { ...document, status: 'APPROVED' }))
            : company.documents,
      })
      toast.success(t(action === 'approve' ? 'admin.companies.toasts.approved' : 'admin.companies.toasts.revoked', { name }))
      return
    }
    setBusy(action)
    try {
      const updated = action === 'approve' ? await adminCompanyService.approve(company.backendId) : await adminCompanyService.revoke(company.backendId)
      onChange(company.key, { status: updated.verified ? 'VERIFIED' : 'IN_REVIEW', taxStatus: updated.taxStatus })
      toast.success(t(action === 'approve' ? 'admin.companies.toasts.approved' : 'admin.companies.toasts.revoked', { name }))
    } catch (caught) {
      // The backend explains a refused badge in words for the operator (an invalid RUC, a bad SUNAT standing).
      const error = ApiError.from(caught)
      toast.error(t('admin.companies.toasts.failed'), error.status === 400 && error.serverMessage ? error.serverMessage : error.message)
    } finally {
      setBusy(null)
    }
  }

  /** No endpoint yet: applied on screen, and said so for a backend company. */
  function localAction(patch: Partial<AdminCompany>, messageKey: 'fixRequested' | 'suspended' | 'reactivated') {
    if (!company) return
    onChange(company.key, patch)
    if (company.source === 'api') toast.info(t(`admin.companies.toasts.${messageKey}`, { name }), t('admin.demo.simulated'))
    else toast.success(t(`admin.companies.toasts.${messageKey}`, { name }))
  }

  const fields: { label: string; value: ReactNode }[] = [
    { label: t('admin.companies.drawer.ruc'), value: <span className="num">{company.ruc}</span> },
    { label: t('admin.companies.drawer.taxStatus'), value: company.taxStatus ?? <span className="text-slate-400">{t('admin.companies.drawer.notChecked')}</span> },
    { label: t('admin.companies.columns.city'), value: company.city },
    { label: t('admin.companies.columns.side'), value: t(`admin.companies.sides.${company.side}`) },
    { label: t('admin.companies.drawer.since'), value: formatDate(company.createdAt) },
    { label: t('admin.companies.columns.equipment'), value: <span className="num">{formatCount(company.equipmentCount)}</span> },
  ]

  return (
    <>
      <Drawer
        isOpen={selected !== null}
        onClose={onClose}
        title={company.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Pill tone={STATUS_TONES[company.status]}>{t(`admin.companies.statuses.${company.status}`)}</Pill>
            {company.source === 'demo' && <DemoMark />}
          </span>
        }
        footer={
          <>
            {company.status === 'SUSPENDED' ? (
              <Button variant="secondary" size="sm" leftIcon={<RotateCcw className="size-4" />} onClick={() => localAction({ status: 'IN_REVIEW' }, 'reactivated')}>
                {t('admin.companies.actions.reactivate')}
              </Button>
            ) : (
              <Button variant="danger" size="sm" leftIcon={<Ban className="size-4" />} onClick={() => setConfirmSuspend(true)}>
                {t('admin.companies.actions.suspend')}
              </Button>
            )}
            {company.status !== 'SUSPENDED' && (
              <Button variant="secondary" size="sm" leftIcon={<Undo2 className="size-4" />} onClick={() => localAction({ status: 'IN_REVIEW' }, 'fixRequested')}>
                {t('admin.companies.actions.requestFix')}
              </Button>
            )}
            {company.status === 'VERIFIED' ? (
              <Button variant="secondary" size="sm" isLoading={busy === 'revoke'} leftIcon={<ShieldOff className="size-4" />} onClick={() => void changeBadge('revoke')}>
                {t('admin.companies.actions.revoke')}
              </Button>
            ) : (
              company.status === 'IN_REVIEW' && (
                <Button variant="action" size="sm" isLoading={busy === 'approve'} leftIcon={<BadgeCheck className="size-4" />} onClick={() => void changeBadge('approve')}>
                  {t('admin.companies.actions.approve')}
                </Button>
              )
            )}
          </>
        }
      >
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div className="col-span-2">
            <dt className="text-xs text-slate-500">{t('admin.companies.drawer.legalName')}</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{company.name}</dd>
          </div>
          {fields.map((field) => (
            <div key={field.label}>
              <dt className="text-xs text-slate-500">{field.label}</dt>
              <dd className="mt-0.5 text-slate-900">{field.value}</dd>
            </div>
          ))}
          <div className="col-span-2">
            <dt className="text-xs text-slate-500">{t('admin.companies.drawer.representative')}</dt>
            <dd className="mt-0.5 text-slate-900">
              {rep === undefined && !repFailed ? (
                <Bar className="mt-1 h-4 w-48" />
              ) : rep ? (
                <>
                  <span className="font-medium">{rep.name}</span>
                  <span className="block text-[13px] text-slate-600">
                    {rep.email}
                    {rep.phone && <span className="num"> · {rep.phone}</span>}
                  </span>
                </>
              ) : (
                <span className="text-slate-500">{repFailed ? t('admin.companies.drawer.repFailed') : t('admin.companies.drawer.noRep')}</span>
              )}
            </dd>
          </div>
        </dl>

        <h3 className="mt-6 text-sm font-semibold text-slate-900">{t('admin.companies.drawer.documents')}</h3>
        {company.source === 'api' && <p className="mt-1 text-xs text-slate-500">{t('admin.companies.drawer.docsApi')}</p>}
        <ul className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200/80">
          {company.documents.map((document) => (
            <li key={document.kind} className="flex items-center gap-3 px-3 py-2.5">
              <FileText className="size-4 shrink-0 text-slate-400" strokeWidth={1.75} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-slate-900">{t(`admin.companies.docs.${document.kind}`)}</span>
                <span className="block text-xs text-slate-500">
                  {document.uploadedAt ? t('admin.companies.drawer.uploaded', { date: formatDate(document.uploadedAt) }) : t('admin.companies.drawer.notUploaded')}
                </span>
              </span>
              <Pill tone={DOC_TONES[document.status]}>{t(`admin.companies.docStatus.${document.status}`)}</Pill>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">{t('admin.companies.drawer.history')}</h3>
          <span className="text-[13px] text-slate-600">
            <Rating company={company} />
          </span>
        </div>
        {company.history.length === 0 ? (
          <p className="mt-2 rounded-md border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-600">
            {company.source === 'api' ? t('admin.companies.drawer.historyApi') : t('admin.companies.drawer.noHistory')}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {company.history.map((record) => (
              <li key={record.code} className="flex items-start justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm text-slate-900">{record.equipment}</span>
                  <span className="block text-xs text-slate-500">
                    <span className="num">{record.code}</span> · {record.city} · {formatDateRange(record.startDate, record.endDate)} · {t(`admin.companies.roles.${record.role}`)}
                  </span>
                </span>
                <span className="num shrink-0 text-sm font-medium text-slate-900">{formatSoles(record.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
      <ConfirmDialog
        isOpen={confirmSuspend}
        title={t('admin.companies.confirmSuspend.title', { name })}
        message={t('admin.companies.confirmSuspend.message')}
        confirmLabel={t('admin.companies.confirmSuspend.confirm')}
        onClose={() => setConfirmSuspend(false)}
        onConfirm={() => {
          setConfirmSuspend(false)
          localAction({ status: 'SUSPENDED' }, 'suspended')
        }}
      />
    </>
  )
}

export default function AdminCompaniesPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data, error, isLoading, reload, setData } = useAdminQuery(adminCompanyService.list)
  const initialTab = searchParams.get('tab')
  const [tab, setTab] = useState<Tab>(isTab(initialTab) ? initialTab : 'all')
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [city, setCity] = useState('all')
  const [status, setStatus] = useState<KybStatus | 'all'>('all')
  const [limit, setLimit] = useState(PAGE)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  // The top bar's search lands here with ?q=: follow it while the screen is open.
  const urlQuery = searchParams.get('q')
  const [syncedQuery, setSyncedQuery] = useState(urlQuery)
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery)
    if (urlQuery !== null) setQuery(urlQuery)
  }

  const companies = useMemo(() => data?.companies ?? [], [data])
  const cities = useMemo(() => [...new Set(companies.map((company) => company.city))].sort((a, b) => a.localeCompare(b)), [companies])
  const filtered = useMemo(() => {
    const needle = normalize(query.trim())
    return companies.filter(
      (company) =>
        (city === 'all' || company.city === city) &&
        (status === 'all' || company.status === status) &&
        (!needle || normalize(company.name).includes(needle) || company.ruc.includes(needle)),
    )
  }, [companies, query, city, status])
  const rows = filtered.filter((company) => matchesTab(company, tab))
  const counts = Object.fromEntries(TABS.map((key) => [key, filtered.filter((company) => matchesTab(company, key)).length])) as Record<Tab, number>
  const pending = companies.filter((company) => company.status === 'IN_REVIEW').length
  const selected = companies.find((company) => company.key === selectedKey) ?? null
  const demoCount = companies.filter((company) => company.source === 'demo').length

  function changeTab(next: Tab) {
    setTab(next)
    setLimit(PAGE)
    setSearchParams(
      (params) => {
        if (next === 'all') params.delete('tab')
        else params.set('tab', next)
        return params
      },
      { replace: true },
    )
  }

  function updateCompany(key: string, patch: Partial<AdminCompany>) {
    setData((current: AdminCompanyDirectory | null) =>
      current ? { ...current, companies: current.companies.map((company) => (company.key === key ? { ...company, ...patch } : company)) } : current,
    )
  }

  const hasFilters = query.trim() !== '' || city !== 'all' || status !== 'all'
  function clearFilters() {
    setQuery('')
    setCity('all')
    setStatus('all')
  }

  return (
    <>
      <AdminPageHeader
        title={t('admin.companies.title')}
        subtitle={data ? t('admin.companies.subtitle', { count: companies.length, formatted: formatCount(companies.length), pending }) : t('common.loading')}
        source={
          <SourceBadge
            kind="mixed"
            detail={data ? t('admin.demo.mixedDetail', { api: data.apiCount, demo: demoCount }) : undefined}
          />
        }
      />
      {data?.apiFailed && <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-[13px] text-amber-800">{t('admin.demo.apiFailed')}</p>}

      <Panel>
        <div className="px-4 pt-2 sm:px-5">
          <Segmented
            variant="underline"
            layoutId="companies-tab"
            label={t('admin.companies.tabsLabel')}
            value={tab}
            onChange={changeTab}
            options={TABS.map((key) => ({ value: key, label: t(`admin.companies.tabs.${key}`), count: data ? counts[key] : undefined }))}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
          <SearchField id="companies-search" value={query} onChange={(value) => { setQuery(value); setLimit(PAGE) }} placeholder={t('admin.companies.search')} className="w-full sm:w-72" />
          <SelectField
            id="companies-city"
            label={t('admin.companies.columns.city')}
            value={city}
            onChange={setCity}
            options={[{ value: 'all', label: t('admin.companies.allCities') }, ...cities.map((name) => ({ value: name, label: name }))]}
            className="min-w-0 flex-1 sm:w-44 sm:flex-none"
          />
          <SelectField
            id="companies-status"
            label={t('admin.companies.columns.status')}
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: t('admin.companies.allStatuses') },
              ...(['VERIFIED', 'IN_REVIEW', 'SUSPENDED'] as const).map((value) => ({ value, label: t(`admin.companies.statuses.${value}`) })),
            ]}
            className="min-w-0 flex-1 sm:w-44 sm:flex-none"
          />
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="h-9 px-2 text-sm font-medium text-slate-600 hover:text-slate-900">
              {t('admin.common.clearFilters')}
            </button>
          )}
          <p className="num ml-auto hidden text-[13px] text-slate-500 md:block">{data && t('admin.common.showing', { shown: Math.min(limit, rows.length), total: rows.length })}</p>
        </div>

        {error && <BlockError message={error.message} onRetry={reload} />}
        {isLoading && !data ? (
          <div className="space-y-2 px-4 pb-4 sm:px-5">
            {Array.from({ length: 8 }, (_, index) => (
              <Bar key={index} className="h-10" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyBlock
            action={
              hasFilters ? (
                <button type="button" onClick={clearFilters} className="text-sm font-semibold text-slate-900 hover:underline">
                  {t('admin.common.clearFilters')}
                </button>
              ) : undefined
            }
          >
            {t('admin.companies.empty')}
          </EmptyBlock>
        ) : (
          <>
            {/* Desktop and tablet: a table. Phones: two-line rows. */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-200/80 text-left text-xs text-slate-500">
                    <th scope="col" className="py-2 pr-3 pl-5 font-medium">{t('admin.companies.columns.company')}</th>
                    <th scope="col" className="px-3 py-2 font-medium">{t('admin.companies.columns.ruc')}</th>
                    <th scope="col" className="px-3 py-2 font-medium">{t('admin.companies.columns.city')}</th>
                    <th scope="col" className="hidden px-3 py-2 font-medium lg:table-cell">{t('admin.companies.columns.side')}</th>
                    <th scope="col" className="hidden px-3 py-2 text-right font-medium xl:table-cell">{t('admin.companies.columns.equipment')}</th>
                    <th scope="col" className="hidden px-3 py-2 text-right font-medium lg:table-cell">{t('admin.companies.columns.rating')}</th>
                    <th scope="col" className="px-3 py-2 font-medium">{t('admin.companies.columns.status')}</th>
                    <th scope="col" className="hidden py-2 pr-5 pl-3 text-right font-medium xl:table-cell">{t('admin.companies.columns.since')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, limit).map((company) => (
                    <tr
                      key={company.key}
                      onClick={() => setSelectedKey(company.key)}
                      className={cn('cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50', selectedKey === company.key && 'bg-slate-50')}
                    >
                      <td className="max-w-[320px] py-2.5 pr-3 pl-5">
                        <button type="button" onClick={() => setSelectedKey(company.key)} className="flex max-w-full items-center text-left font-medium text-slate-900 hover:underline focus-visible:outline-2 focus-visible:outline-brand">
                          <span className="truncate">{company.name}</span>
                          {company.source === 'demo' && <DemoMark />}
                        </button>
                      </td>
                      <td className="num px-3 py-2.5 text-slate-700">{company.ruc}</td>
                      <td className="px-3 py-2.5 text-slate-700">{company.city}</td>
                      <td className="hidden px-3 py-2.5 text-slate-700 lg:table-cell">{t(`admin.companies.sides.${company.side}`)}</td>
                      <td className="num hidden px-3 py-2.5 text-right text-slate-700 xl:table-cell">{company.equipmentCount || <span className="text-slate-400">—</span>}</td>
                      <td className="hidden px-3 py-2.5 text-right text-slate-700 lg:table-cell">
                        <Rating company={company} />
                      </td>
                      <td className="px-3 py-2.5">
                        <Pill tone={STATUS_TONES[company.status]}>{t(`admin.companies.statuses.${company.status}`)}</Pill>
                      </td>
                      <td className="num hidden py-2.5 pr-5 pl-3 text-right text-slate-600 xl:table-cell">{formatDate(company.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 border-t border-slate-200/80 md:hidden">
              {rows.slice(0, limit).map((company) => (
                <li key={company.key}>
                  <button type="button" onClick={() => setSelectedKey(company.key)} className="flex w-full items-start gap-3 px-4 py-3 text-left active:bg-slate-50">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center text-sm font-medium text-slate-900">
                        <span className="truncate">{company.name}</span>
                        {company.source === 'demo' && <DemoMark />}
                      </span>
                      <span className="num mt-0.5 block text-[13px] text-slate-600">
                        {company.ruc} · {company.city} · {t(`admin.companies.sides.${company.side}`)}
                      </span>
                    </span>
                    <Pill tone={STATUS_TONES[company.status]}>{t(`admin.companies.statuses.${company.status}`)}</Pill>
                  </button>
                </li>
              ))}
            </ul>
            {rows.length > limit && (
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
                <span className="num text-[13px] text-slate-500">{t('admin.common.showing', { shown: limit, total: rows.length })}</span>
                <Button variant="secondary" size="sm" onClick={() => setLimit((value) => value + PAGE)}>
                  {t('admin.common.showMore')}
                </Button>
              </div>
            )}
          </>
        )}
      </Panel>

      <CompanyDrawer company={selected} onClose={() => setSelectedKey(null)} onChange={updateCompany} />
    </>
  )
}
