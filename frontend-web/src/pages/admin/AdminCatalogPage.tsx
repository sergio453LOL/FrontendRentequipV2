import { Pencil, Sparkles, Star, Truck } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { AdminPageHeader, Bar, BlockError, DemoMark, EmptyBlock, Panel, Pill, SearchField, Segmented, SelectField, SourceBadge, Switch, Tag, type PillTone } from '../../components/admin/AdminUi'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { useAdminQuery } from '../../hooks/useAdminQuery'
import { useToast } from '../../hooks/useToast'
import { adminCatalogService } from '../../services/adminCatalogService'
import type { AdminCatalog, AdminEquipment, AdminWorkType, FleetAvailability } from '../../types'
import { formatCount, formatSoles } from '../../utils/adminFormat'
import { cn } from '../../utils/cn'

const PAGE = 40
const WORK_TYPES: AdminWorkType[] = ['earthworks', 'lifting', 'compaction', 'manual']
const AVAILABILITIES: FleetAvailability[] = ['ON_SITE', 'AVAILABLE', 'MAINTENANCE']
const AVAILABILITY_TONES: Record<FleetAvailability, PillTone> = { ON_SITE: 'blue', AVAILABLE: 'green', MAINTENANCE: 'amber' }

/** Backend names often carry the model already ("Retroexcavadora JCB 3CX"); demo names do not. */
const machineTitle = (item: AdminEquipment) => (item.name.includes(item.model) ? item.name : `${item.name} ${item.brand} ${item.model}`)

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function Thumbnail({ item, className }: { item: AdminEquipment; className?: string }) {
  if (item.imageUrl) return <img src={item.imageUrl} alt="" loading="lazy" className={cn('rounded object-cover', className)} />
  return (
    <span className={cn('flex items-center justify-center rounded bg-slate-100 text-slate-400', className)} aria-hidden="true">
      <Truck className="size-4" strokeWidth={1.5} />
    </span>
  )
}

function Badges({ item }: { item: AdminEquipment }) {
  const { t } = useTranslation()
  if (!item.featured && !item.aiSuggested) return null
  return (
    <span className="flex flex-wrap gap-1">
      {item.featured && (
        <Tag tone="amber" icon={<Star className="size-3 fill-current" aria-hidden="true" />}>
          {t('admin.catalog.featured')}
        </Tag>
      )}
      {item.aiSuggested && <Tag icon={<Sparkles className="size-3" aria-hidden="true" />}>{t('admin.catalog.aiSuggested')}</Tag>}
    </span>
  )
}

function EditModal({ item, onClose, onSave }: { item: AdminEquipment | null; onClose: () => void; onSave: (patch: Partial<AdminEquipment>) => void }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<{ key: string; rate: string; featured: boolean; aiSuggested: boolean } | null>(null)
  if (item && draft?.key !== item.key) {
    setDraft({ key: item.key, rate: String(item.dailyRate), featured: item.featured, aiSuggested: item.aiSuggested })
  }
  const rate = Number(draft?.rate.replace(',', '.'))
  const isValid = Number.isFinite(rate) && rate > 0

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft || !isValid) return
    onSave({ dailyRate: Math.round(rate * 100) / 100, featured: draft.featured, aiSuggested: draft.aiSuggested })
  }

  return (
    <Modal
      isOpen={item !== null}
      onClose={onClose}
      title={item ? t('admin.catalog.editTitle', { name: machineTitle(item) }) : ''}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="action" type="submit" form="quick-edit" disabled={!isValid}>
            {t('admin.catalog.save')}
          </Button>
        </>
      }
    >
      {draft && (
        <form id="quick-edit" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="quick-rate" className="text-sm font-medium text-slate-800">
              {t('admin.catalog.rateLabel')}
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-500">S/</span>
              <input
                id="quick-rate"
                inputMode="decimal"
                value={draft.rate}
                onChange={(event) => setDraft({ ...draft, rate: event.target.value })}
                aria-invalid={!isValid}
                aria-describedby={!isValid ? 'quick-rate-error' : undefined}
                className="num h-10 w-full rounded-md border border-slate-300 bg-white pr-3 pl-9 text-sm text-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
              />
            </div>
            {!isValid && (
              <p id="quick-rate-error" className="mt-1 text-xs text-negative">
                {t('admin.catalog.rateInvalid')}
              </p>
            )}
          </div>
          <label className="flex items-center justify-between gap-3 text-sm text-slate-800">
            {t('admin.catalog.featuredLabel')}
            <Switch checked={draft.featured} onChange={(featured) => setDraft({ ...draft, featured })} label={t('admin.catalog.featuredLabel')} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm text-slate-800">
            {t('admin.catalog.aiLabel')}
            <Switch checked={draft.aiSuggested} onChange={(aiSuggested) => setDraft({ ...draft, aiSuggested })} label={t('admin.catalog.aiLabel')} />
          </label>
          {item?.source === 'api' && <p className="text-xs text-slate-500">{t('admin.demo.simulated')}</p>}
        </form>
      )}
    </Modal>
  )
}

export default function AdminCatalogPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const { data, error, isLoading, reload, setData } = useAdminQuery(adminCatalogService.list)
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [workType, setWorkType] = useState<AdminWorkType | 'all'>('all')
  const [availability, setAvailability] = useState<FleetAvailability | 'all'>('all')
  const [limit, setLimit] = useState(PAGE)
  const [editingKey, setEditingKey] = useState<string | null>(null)

  const urlQuery = searchParams.get('q')
  const [syncedQuery, setSyncedQuery] = useState(urlQuery)
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery)
    if (urlQuery !== null) setQuery(urlQuery)
  }

  const items = useMemo(() => data?.items ?? [], [data])
  const filtered = useMemo(() => {
    const needle = normalize(query.trim())
    return items.filter(
      (item) =>
        (workType === 'all' || item.workType === workType) &&
        (availability === 'all' || item.availability === availability) &&
        (!needle || normalize(`${item.name} ${item.brand} ${item.model} ${item.owner} ${item.city}`).includes(needle)),
    )
  }, [items, query, workType, availability])
  const onSite = items.filter((item) => item.availability === 'ON_SITE').length
  const editing = items.find((item) => item.key === editingKey) ?? null
  const shown = filtered.slice(0, limit)
  const hasFilters = query.trim() !== '' || workType !== 'all' || availability !== 'all'

  function update(key: string, patch: Partial<AdminEquipment>) {
    setData((current: AdminCatalog | null) => (current ? { ...current, items: current.items.map((item) => (item.key === key ? { ...item, ...patch } : item)) } : current))
  }

  function togglePublished(item: AdminEquipment, published: boolean) {
    update(item.key, { published })
    const message = t(published ? 'admin.catalog.publishedToast' : 'admin.catalog.hiddenToast', { name: machineTitle(item) })
    if (item.source === 'api') toast.info(message, t('admin.demo.simulated'))
    else toast.success(message)
  }

  function clearFilters() {
    setQuery('')
    setWorkType('all')
    setAvailability('all')
  }

  return (
    <>
      <AdminPageHeader
        title={t('admin.catalog.title')}
        subtitle={data ? t('admin.catalog.subtitle', { count: items.length, formatted: formatCount(items.length), onSite: formatCount(onSite) }) : t('common.loading')}
        source={<SourceBadge kind="mixed" detail={data ? t('admin.demo.mixedDetail', { api: data.apiCount, demo: items.length - data.apiCount }) : undefined} />}
      />
      {data?.apiFailed && <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-[13px] text-amber-800">{t('admin.demo.apiFailed')}</p>}

      <Panel>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
          <SearchField id="catalog-search" value={query} onChange={(value) => { setQuery(value); setLimit(PAGE) }} placeholder={t('admin.catalog.search')} className="w-full sm:w-72" />
          <SelectField
            id="catalog-type"
            label={t('admin.catalog.columns.workType')}
            value={workType}
            onChange={(value) => { setWorkType(value); setLimit(PAGE) }}
            options={[{ value: 'all', label: t('admin.catalog.allWorkTypes') }, ...WORK_TYPES.map((value) => ({ value, label: t(`admin.workTypes.${value}`) }))]}
            className="min-w-[9rem] flex-1 sm:w-52 sm:flex-none"
          />
          <SelectField
            id="catalog-availability"
            label={t('admin.catalog.columns.availability')}
            value={availability}
            onChange={(value) => { setAvailability(value); setLimit(PAGE) }}
            options={[{ value: 'all', label: t('admin.catalog.allAvailability') }, ...AVAILABILITIES.map((value) => ({ value, label: t(`admin.catalog.availabilities.${value}`) }))]}
            className="min-w-[9rem] flex-1 sm:w-44 sm:flex-none"
          />
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="h-9 px-2 text-sm font-medium text-slate-600 hover:text-slate-900">
              {t('admin.common.clearFilters')}
            </button>
          )}
          <Segmented
            layoutId="catalog-view"
            label={t('admin.catalog.viewLabel')}
            value={view}
            onChange={setView}
            options={[
              { value: 'table', label: t('admin.catalog.views.table') },
              { value: 'cards', label: t('admin.catalog.views.cards') },
            ]}
            className="ml-auto"
          />
        </div>

        {error && <BlockError message={error.message} onRetry={reload} />}
        {isLoading && !data ? (
          <div className="space-y-2 px-4 pb-4 sm:px-5">
            {Array.from({ length: 10 }, (_, index) => (
              <Bar key={index} className="h-11" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyBlock
            action={
              hasFilters ? (
                <button type="button" onClick={clearFilters} className="text-sm font-semibold text-slate-900 hover:underline">
                  {t('admin.common.clearFilters')}
                </button>
              ) : undefined
            }
          >
            {t('admin.catalog.empty')}
          </EmptyBlock>
        ) : view === 'table' ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-200/80 text-left text-xs text-slate-500">
                    <th scope="col" className="py-2 pr-3 pl-5 font-medium">{t('admin.catalog.columns.equipment')}</th>
                    <th scope="col" className="hidden px-3 py-2 font-medium lg:table-cell">{t('admin.catalog.columns.owner')}</th>
                    <th scope="col" className="px-3 py-2 font-medium">{t('admin.catalog.columns.city')}</th>
                    <th scope="col" className="hidden px-3 py-2 font-medium xl:table-cell">{t('admin.catalog.columns.workType')}</th>
                    <th scope="col" className="px-3 py-2 font-medium">{t('admin.catalog.columns.availability')}</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">{t('admin.catalog.columns.rate')}</th>
                    <th scope="col" className="px-3 py-2 text-center font-medium">{t('admin.catalog.columns.published')}</th>
                    <th scope="col" className="py-2 pr-5 pl-3">
                      <span className="sr-only">{t('admin.catalog.edit')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((item) => (
                    <tr key={item.key} className={cn('border-b border-slate-100 hover:bg-slate-50', !item.published && 'text-slate-500')}>
                      <td className="max-w-[340px] py-2 pr-3 pl-5">
                        <div className="flex items-center gap-3">
                          <Thumbnail item={item} className={cn('size-9 shrink-0', !item.published && 'opacity-50')} />
                          <div className="min-w-0">
                            <p className="flex items-center font-medium text-slate-900">
                              <span className="truncate">{item.name}</span>
                              {item.source === 'demo' && <DemoMark />}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-xs text-slate-500">
                                {item.brand} {item.model}
                                {item.year && <span className="num"> · {item.year}</span>}
                              </span>
                              <Badges item={item} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden max-w-[220px] truncate px-3 py-2 text-slate-700 lg:table-cell">{item.owner}</td>
                      <td className="px-3 py-2 text-slate-700">{item.city}</td>
                      <td className="hidden px-3 py-2 text-slate-700 xl:table-cell">{t(`admin.workTypes.${item.workType}`)}</td>
                      <td className="px-3 py-2">
                        <Pill tone={AVAILABILITY_TONES[item.availability]}>{t(`admin.catalog.availabilities.${item.availability}`)}</Pill>
                      </td>
                      <td className="num px-3 py-2 text-right font-medium whitespace-nowrap text-slate-900">{formatSoles(item.dailyRate)}</td>
                      <td className="px-3 py-2 text-center">
                        <Switch checked={item.published} onChange={(published) => togglePublished(item, published)} label={t('admin.catalog.togglePublished', { name: machineTitle(item) })} />
                      </td>
                      <td className="py-2 pr-5 pl-3 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingKey(item.key)}
                          aria-label={t('admin.catalog.editTitle', { name: machineTitle(item) })}
                          className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Pencil className="size-4" strokeWidth={1.75} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 border-t border-slate-200/80 md:hidden">
              {shown.map((item) => (
                <li key={item.key} className="flex items-start gap-3 px-4 py-3">
                  <Thumbnail item={item} className="size-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center text-sm font-medium text-slate-900">
                      <span className="truncate">
                        {item.name} {item.model}
                      </span>
                      {item.source === 'demo' && <DemoMark />}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-slate-600">
                      {item.owner} · {item.city}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Pill tone={AVAILABILITY_TONES[item.availability]}>{t(`admin.catalog.availabilities.${item.availability}`)}</Pill>
                      <Badges item={item} />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="num text-sm font-semibold text-slate-900">{formatSoles(item.dailyRate)}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setEditingKey(item.key)} aria-label={t('admin.catalog.editTitle', { name: machineTitle(item) })} className="flex size-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">
                        <Pencil className="size-4" strokeWidth={1.75} />
                      </button>
                      <Switch checked={item.published} onChange={(published) => togglePublished(item, published)} label={t('admin.catalog.togglePublished', { name: machineTitle(item) })} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <ul className="grid gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3 2xl:grid-cols-4">
            {shown.map((item) => (
              <li key={item.key} className={cn('flex flex-col overflow-hidden rounded-lg border border-slate-200/80', !item.published && 'bg-slate-50')}>
                <Thumbnail item={item} className={cn('h-32 w-full rounded-none', !item.published && 'opacity-50')} />
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center text-sm font-medium text-slate-900">
                        <span className="truncate">{item.name}</span>
                        {item.source === 'demo' && <DemoMark />}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {item.brand} {item.model} · {item.city}
                      </p>
                    </div>
                    <span className="num shrink-0 text-sm font-semibold text-slate-900">{formatSoles(item.dailyRate)}</span>
                  </div>
                  <p className="truncate text-xs text-slate-600">{item.owner}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill tone={AVAILABILITY_TONES[item.availability]}>{t(`admin.catalog.availabilities.${item.availability}`)}</Pill>
                    <Badges item={item} />
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                    <span className="flex items-center gap-2 text-xs text-slate-600">
                      <Switch checked={item.published} onChange={(published) => togglePublished(item, published)} label={t('admin.catalog.togglePublished', { name: machineTitle(item) })} />
                      {item.published ? t('admin.catalog.published') : t('admin.catalog.hidden')}
                    </span>
                    <Button variant="ghost" size="sm" leftIcon={<Pencil className="size-3.5" />} onClick={() => setEditingKey(item.key)}>
                      {t('admin.catalog.edit')}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
            <span className="num text-[13px] text-slate-500">{t('admin.common.showing', { shown: shown.length, total: filtered.length })}</span>
            {filtered.length > limit && (
              <Button variant="secondary" size="sm" onClick={() => setLimit((value) => value + PAGE)}>
                {t('admin.common.showMore')}
              </Button>
            )}
          </div>
        )}
      </Panel>

      <EditModal
        item={editing}
        onClose={() => setEditingKey(null)}
        onSave={(patch) => {
          if (!editing) return
          update(editing.key, patch)
          setEditingKey(null)
          const message = t('admin.catalog.saved', { name: machineTitle(editing) })
          if (editing.source === 'api') toast.info(message, t('admin.demo.simulated'))
          else toast.success(message)
        }}
      />
    </>
  )
}
