import { motion } from 'framer-motion'
import { FilterX, LayoutGrid, Map as MapIcon, SearchX } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { PageHeader } from '../components/common/PageHeader'
import { Pagination } from '../components/common/Pagination'
import { Select } from '../components/common/Select'
import { SkeletonLoader } from '../components/common/SkeletonLoader'
import { CatalogSearch } from '../components/common/TopBar'
import { EquipmentCard } from '../components/equipment/EquipmentCard'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import { usePagination } from '../hooks/usePagination'
import { useQueryParam } from '../hooks/useQueryParam'
import { api } from '../services/api'
import { ENDPOINTS } from '../services/endpoints'
import type { EquipmentCategory, EquipmentSummary, PageResponse } from '../types'
import { useAiSuggested } from '../utils/aiSuggestions'
import { PERU_CITIES } from '../utils/cities'
import { categoryName } from '../utils/categoryName'
import { cn } from '../utils/cn'
import { formatNumber, todayIso } from '../utils/format'
import { categoryIdsFor, isWorkType, WORK_TYPES, type WorkType } from '../utils/workTypes'

const ALL = 'all'
/** Marks no category card while a type of work is the active filter. */
const WORK_TYPE_ACTIVE = 'work-type'

// Leaflet only downloads when someone opens the map.
const EquipmentMap = lazy(() => import('../components/equipment/EquipmentMap'))

type CatalogView = 'grid' | 'map'

function ViewToggle({ view, onChange }: { view: CatalogView; onChange: (view: CatalogView) => void }) {
  const { t } = useTranslation()
  return (
    <div role="radiogroup" aria-label={t('catalog.view')} className="relative grid h-9 grid-cols-2 rounded-lg bg-slate-100 p-1 ring-1 ring-slate-200/80 ring-inset">
      {([
        { value: 'grid', label: t('catalog.grid'), icon: LayoutGrid },
        { value: 'map', label: t('catalog.map'), icon: MapIcon },
      ] as const).map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={view === value}
          onClick={() => onChange(value)}
          className={cn('relative flex items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors', view === value ? 'text-ink' : 'text-slate-500 hover:text-ink')}
        >
          {view === value && (
            <motion.span layoutId="catalog-view" className="absolute inset-0 rounded-md bg-white shadow-sm" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
          )}
          <Icon className="relative size-4" aria-hidden="true" />
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  )
}

interface CountFilters {
  q?: string
  city?: string
  excludeOwnerId?: number
}

/**
 * How many machines each category holds under the current search and city, so the type filter shows
 * what a click will return. One request per category, asking only for the total.
 */
function useCategoryCounts(categories: EquipmentCategory[], filters: CountFilters): Record<string, number> | null {
  const key = JSON.stringify({ ids: categories.map((category) => category.id), ...filters })
  const [result, setResult] = useState<{ key: string; counts: Record<string, number> } | null>(null)

  useEffect(() => {
    if (categories.length === 0) return
    const controller = new AbortController()
    const ids: (number | null)[] = [null, ...categories.map((category) => category.id)]
    Promise.all(
      ids.map(async (categoryId) => {
        const { data } = await api.get<PageResponse<EquipmentSummary>>(ENDPOINTS.equipmentSearch, {
          params: { ...filters, categoryId: categoryId ?? undefined, page: 0, size: 1 },
          signal: controller.signal,
        })
        return [categoryId === null ? ALL : String(categoryId), data.totalElements] as const
      }),
    )
      .then((entries) => setResult({ key, counts: Object.fromEntries(entries) }))
      .catch(() => undefined)
    return () => controller.abort()
    // `key` captures categories and filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return result?.key === key ? result.counts : null
}

function CategoryCards({
  categories,
  counts,
  selected,
  onSelect,
}: {
  categories: EquipmentCategory[]
  counts: Record<string, number> | null
  selected: string
  onSelect: (value: string) => void
}) {
  const { t } = useTranslation()
  const items = [
    { value: '', id: ALL, name: t('catalog.all') },
    ...categories.map((category) => ({ value: String(category.id), id: String(category.id), name: categoryName(category.name) })),
  ]
  return (
    <div role="group" aria-label={t('catalog.type')} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {items.map((item) => {
        const isSelected = selected === item.value
        const count = counts?.[item.id]
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(item.value)}
            className={cn(
              'flex h-16 min-w-0 flex-col justify-center rounded-xl border px-4 text-left transition-all duration-200',
              isSelected ? 'border-brand bg-accent-tint ring-1 ring-brand' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
            )}
          >
            <span className="truncate text-[13px] text-slate-600">{item.name}</span>
            <span className={cn('num text-lg font-bold', count === 0 ? 'text-slate-400' : 'text-ink')}>
              {count === undefined ? '–' : formatNumber(count)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** "What are you going to do?": four jobs, each one searching every machine family that does it. */
function WorkTypeFilter({ selected, onSelect }: { selected: WorkType | null; onSelect: (value: WorkType | null) => void }) {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="work-type-title">
      <h2 id="work-type-title" className="mb-3 text-base font-bold text-ink">
        {t('workTypes.title')}
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {WORK_TYPES.map(({ id, icon: Icon }, index) => {
          const isSelected = selected === id
          return (
            <motion.button
              key={id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(isSelected ? null : id)}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'flex min-h-[84px] items-center gap-3 rounded-xl p-4 text-left transition-colors',
                isSelected ? 'border border-brand bg-accent-tint text-ink shadow-sm ring-1 ring-brand' : 'border border-slate-200/80 bg-white text-ink shadow-sm hover:border-slate-300',
              )}
            >
              <span
                className={cn(
                  'flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors',
                  isSelected ? 'bg-brand text-[#0f172a]' : 'bg-accent-tint text-accent-ink',
                )}
              >
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{t(`workTypes.${id}.title`)}</span>
                <span className={cn('block text-xs leading-snug', 'text-slate-500')}>
                  {t(`workTypes.${id}.hint`)}
                </span>
              </span>
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}

export default function CatalogPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [, setSearchParams] = useSearchParams()
  const [query] = useQueryParam('q')
  const [categoryId, setCategoryIdParam] = useQueryParam('categoryId')
  const [workParam, setWorkParam] = useQueryParam('obra')
  const workType = isWorkType(workParam) ? workParam : null
  const [city, setCity] = useQueryParam('city')
  const [viewParam, setViewParam] = useQueryParam('view')
  // Dates picked in the landing search: only machines free for the whole range.
  const [startDate] = useQueryParam('startDate')
  const [endDate] = useQueryParam('endDate')
  const view: CatalogView = viewParam === 'map' ? 'map' : 'grid'
  const { page, size, setPage, setSize } = usePagination()

  const categories = useFetch<EquipmentCategory[]>(ENDPOINTS.categories)
  const filters: CountFilters = { q: query || undefined, city: city || undefined, excludeOwnerId: user?.companyId }
  const counts = useCategoryCounts(categories.data ?? [], filters)
  // A type of work searches all its categories at once; a single category wins when both are set.
  const workCategoryIds = workType && !categoryId ? categoryIdsFor(workType, categories.data ?? []) : []
  const categoryFilter = {
    categoryId: categoryId || undefined,
    categoryIds: workCategoryIds.length > 0 ? workCategoryIds.join(',') : undefined,
  }
  const results = useFetch<PageResponse<EquipmentSummary>>(ENDPOINTS.equipmentSearch, {
    ...filters,
    ...categoryFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    size,
  })
  // Same search limited to machines free today: those get the "immediate delivery" tag.
  const today = todayIso()
  const freeToday = useFetch<PageResponse<EquipmentSummary>>(ENDPOINTS.equipmentSearch, {
    ...filters,
    ...categoryFilter,
    startDate: today,
    endDate: today,
    page: 0,
    size: 100,
  })
  const freeTodayIds = new Set(freeToday.data?.content.map((machine) => machine.id) ?? [])
  const aiSuggested = useAiSuggested()

  function setCategoryId(value: string) {
    setCategoryIdParam(value)
    if (value) setWorkParam('')
  }

  function setWorkType(value: WorkType | null) {
    setWorkParam(value ?? '')
    if (value) setCategoryIdParam('')
  }

  const hasFilters = Boolean(query || categoryId || city || workType)
  const total = results.data?.totalElements

  function clearFilters() {
    setSearchParams({}, { replace: true })
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <PageHeader
        title={t('catalog.title')}
        description={
          query
            ? t('catalog.resultsFor', { query })
            : t('catalog.description')
        }
        breadcrumbs={[{ label: t('nav.catalog') }]}
      />

      <CatalogSearch id="catalog-page-search" className="sm:hidden" />

      <WorkTypeFilter selected={workType} onSelect={setWorkType} />

      {categories.error ? (
        <p className="text-sm text-slate-600">{t('catalog.categoriesError')}</p>
      ) : (
        <CategoryCards categories={categories.data ?? []} counts={counts} selected={workType && !categoryId ? WORK_TYPE_ACTIVE : categoryId} onSelect={setCategoryId} />
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="num text-sm text-slate-600" aria-live="polite">
          {total === undefined ? t('catalog.searching') : t('catalog.count', { count: total, formatted: formatNumber(total) })}
          {city && t('catalog.inCity', { city })}
        </p>
        <div className="flex items-end gap-2">
          <ViewToggle view={view} onChange={(next) => setViewParam(next === 'map' ? 'map' : '')} />
          <Select
            label={t('catalog.city')}
            placeholder={t('catalog.allCities')}
            value={city}
            onChange={(event) => setCity(event.target.value)}
            options={PERU_CITIES.map((item) => ({ value: item.name, label: item.name }))}
            className="w-48"
          />
          {hasFilters && (
            <Button variant="ghost" onClick={clearFilters} leftIcon={<FilterX className="size-4" />}>
              {t('catalog.clear')}
            </Button>
          )}
        </div>
      </div>

      {results.error && <ErrorState error={results.error} onRetry={results.refetch} />}

      {!results.error && !results.data && <SkeletonLoader variant="card" count={8} />}

      {!results.error && results.data && results.data.totalElements === 0 && (
        <EmptyState
          icon={SearchX}
          title={hasFilters ? t('catalog.noResultsTitle') : t('catalog.emptyTitle')}
          description={
            hasFilters
              ? t('catalog.noResultsText')
              : t('catalog.emptyText')
          }
          action={
            hasFilters && (
              <Button onClick={clearFilters} leftIcon={<FilterX className="size-4" />}>
                {t('catalog.clearFilters')}
              </Button>
            )
          }
        />
      )}

      {!results.error && results.data && results.data.totalElements > 0 && view === 'map' && (
        <Suspense fallback={<div className="h-[560px] rounded-2xl border border-slate-200/80 bg-white" aria-busy="true" aria-label={t('catalog.loadingMap')} />}>
          <EquipmentMap machines={results.data.content} />
        </Suspense>
      )}

      {!results.error && results.data && results.data.totalElements > 0 && view === 'grid' && (
        <>
          <ul
            aria-busy={results.isLoading}
            className={cn(
              'grid gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
              results.isLoading && 'opacity-60',
            )}
          >
            {results.data.content.map((equipment) => (
              <li key={equipment.id}>
                <EquipmentCard
                  equipment={equipment}
                  suggestedByAi={aiSuggested.has(equipment.id)}
                  availableToday={freeTodayIds.has(equipment.id)}
                />
              </li>
            ))}
          </ul>
          <Pagination pageData={results.data} onPageChange={setPage} onSizeChange={setSize} isDisabled={results.isLoading} />
        </>
      )}
    </div>
  )
}
