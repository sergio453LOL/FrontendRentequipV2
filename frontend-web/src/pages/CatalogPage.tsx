import { motion } from 'framer-motion'
import { ArrowDownUp, ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Columns2, FilterX, LayoutGrid, PanelRightClose, LocateFixed, Map as MapIcon, MapPin, SearchX, Sparkles, Tag } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { PageHeader } from '../components/common/PageHeader'
import { Pagination } from '../components/common/Pagination'
import { SkeletonLoader } from '../components/common/SkeletonLoader'
import { CatalogSearch } from '../components/common/TopBar'
import { EquipmentCard } from '../components/equipment/EquipmentCard'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { usePagination } from '../hooks/usePagination'
import { useQueryParam } from '../hooks/useQueryParam'
import { useToast } from '../hooks/useToast'
import { useVisitorLocation } from '../hooks/useVisitorLocation'
import { api } from '../services/api'
import { ENDPOINTS } from '../services/endpoints'
import type { EquipmentCategory, EquipmentSummary, PageResponse } from '../types'
import { useAiSuggested } from '../utils/aiSuggestions'
import { ASSISTANT_PARAM } from '../utils/assistantLink'
import { PERU_CITIES } from '../utils/cities'
import { useRefreshSignal } from '../hooks/useRefreshSignal'
import { categoryName } from '../utils/categoryName'
import { cn } from '../utils/cn'
import { formatNumber, todayIso } from '../utils/format'
import { categoryIdsFor, isWorkType, WORK_TYPES, type WorkType } from '../utils/workTypes'

const ALL = 'all'
/** Marks no category as active while a type of work is the filter. */
const WORK_TYPE_ACTIVE = 'work-type'
/** One spring for every sliding indicator on the screen, so they move alike. */
const PILL_SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const

// Leaflet only downloads when someone opens the map.
const EquipmentMap = lazy(() => import('../components/equipment/EquipmentMap'))

/** `split` is the map above the list; on a phone the map would trap the scroll, so narrow screens show the grid. */
type CatalogView = 'split' | 'grid' | 'map'
const CATALOG_VIEWS: readonly CatalogView[] = ['split', 'grid', 'map']
/** The last view the renter picked, so a hidden map stays hidden on the next visit. */
const VIEW_STORAGE_KEY = 'rentequip.catalog.view'

function isCatalogView(value: string | null): value is CatalogView {
  return value !== null && (CATALOG_VIEWS as readonly string[]).includes(value)
}

function readStoredView(): CatalogView | null {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY)
    return isCatalogView(stored) ? stored : null
  } catch {
    return null
  }
}

function storeView(view: CatalogView) {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view)
  } catch {
    // Private mode or blocked storage: the choice still holds through the URL for this visit.
  }
}

function ViewToggle({ view, onChange }: { view: CatalogView; onChange: (view: CatalogView) => void }) {
  const { t } = useTranslation()
  return (
    <div role="radiogroup" aria-label={t('catalog.view')} className="relative flex h-9 rounded-lg border border-slate-200/80 bg-slate-100 p-0.5">
      {(
        [
          { value: 'split', label: t('catalog.split'), icon: Columns2 },
          { value: 'grid', label: t('catalog.grid'), icon: LayoutGrid },
          { value: 'map', label: t('catalog.map'), icon: MapIcon },
        ] as const
      ).map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={view === value}
          onClick={() => onChange(value)}
          className={cn(
            'relative flex items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
            view === value ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900',
            value === 'split' && 'hidden lg:flex',
          )}
        >
          {view === value && (
            <motion.span
              layoutId="catalog-view"
              className="absolute inset-0 rounded-md bg-white shadow-sm ring-1 ring-slate-200/80"
              transition={PILL_SPRING}
            />
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
  brand?: string
  excludeOwnerId?: number
}

/**
 * How many machines each category holds under the current search and city, so the type filter shows
 * what a click will return. One request per category, asking only for the total.
 */
function useCategoryCounts(categories: EquipmentCategory[], filters: CountFilters): Record<string, number> | null {
  const refreshSignal = useRefreshSignal()
  const key = JSON.stringify({
    ids: categories.map((category) => category.id),
    ...filters,
    refreshSignal,
  })
  const [result, setResult] = useState<{
    key: string
    counts: Record<string, number>
  } | null>(null)

  useEffect(() => {
    if (categories.length === 0) return
    const controller = new AbortController()
    const ids: (number | null)[] = [null, ...categories.map((category) => category.id)]
    Promise.all(
      ids.map(async (categoryId) => {
        const { data } = await api.get<PageResponse<EquipmentSummary>>(ENDPOINTS.equipmentSearch, {
          params: {
            ...filters,
            categoryId: categoryId ?? undefined,
            page: 0,
            size: 1,
          },
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

/** Machines a type of work holds: the sum of its categories' counts. */
function workTypeCount(workType: WorkType, categories: EquipmentCategory[], counts: Record<string, number> | null) {
  if (!counts) return undefined
  return categoryIdsFor(workType, categories).reduce((sum, id) => sum + (counts[String(id)] ?? 0), 0)
}

/**
 * The advisor, one line under the title: the renter types the job and the advisor opens already asked
 * (`?asistente=` is read by the layout, which opens the chat and sends the question once).
 */
function AiAssistBand() {
  const { t } = useTranslation()
  const [, setSearchParams] = useSearchParams()
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    const question = text.trim()
    if (!question) {
      inputRef.current?.focus()
      return
    }
    setSearchParams(
      (params) => {
        params.set(ASSISTANT_PARAM, question)
        return params
      },
      { replace: true },
    )
    setText('')
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-3 rounded-xl border border-brand/40 bg-white py-1.5 pr-1.5 pl-3.5 shadow-sm transition-colors focus-within:border-brand"
    >
      <Sparkles className="size-4 shrink-0 text-accent-ink" aria-hidden="true" />
      <p className="hidden shrink-0 text-sm font-semibold text-slate-900 lg:block">{t('catalog.aiQuestion')}</p>
      <label className="min-w-0 flex-1">
        <span className="sr-only">{t('catalog.aiLabel')}</span>
        <input
          ref={inputRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t('catalog.aiPlaceholder')}
          maxLength={300}
          className="h-9 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
      </label>
      <motion.button
        type="submit"
        whileTap={{ scale: 0.97 }}
        className="group flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3.5 text-sm font-semibold text-sheet transition-colors hover:bg-ink-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <span className="hidden sm:inline">{t('catalog.aiCta')}</span>
        <span className="sm:hidden">{t('catalog.aiCtaShort')}</span>
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
      </motion.button>
    </form>
  )
}

/** "What are you going to do?" as one line of compact pills: each job searches every family that does it. */
function WorkTypePills({
  selected,
  countFor,
  onSelect,
}: {
  selected: WorkType | null
  countFor: (workType: WorkType) => number | undefined
  onSelect: (value: WorkType | null) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <h2 id="work-type-title" className="shrink-0 text-sm font-semibold text-slate-900">
        {t('workTypes.title')}
      </h2>
      <div
        role="group"
        aria-labelledby="work-type-title"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {WORK_TYPES.map(({ id, icon: Icon }) => {
          const isSelected = selected === id
          const count = countFor(id)
          return (
            <motion.button
              key={id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(isSelected ? null : id)}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                isSelected
                  ? 'border-ink bg-ink text-sheet'
                  : 'border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900',
              )}
            >
              <Icon className={cn('size-4', isSelected ? 'text-brand' : 'text-slate-500')} aria-hidden="true" />
              {t(`workTypes.${id}.title`)}
              {count !== undefined && (
                <span className={cn('num text-xs', isSelected ? 'text-sheet/70' : 'text-slate-400')}>{formatNumber(count)}</span>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Every machine family on one scrollable bar. The active one sits on a yellow pill that slides between
 * them; the families of the chosen type of work are tinted.
 */
function CategoryTabs({
  categories,
  counts,
  selected,
  included,
  onSelect,
}: {
  categories: EquipmentCategory[]
  counts: Record<string, number> | null
  selected: string
  included: ReadonlySet<number>
  onSelect: (value: string) => void
}) {
  const { t } = useTranslation()
  const scroller = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: false, end: false })
  const items = [
    { value: '', id: ALL, name: t('catalog.all') },
    ...categories.map((category) => ({
      value: String(category.id),
      id: String(category.id),
      name: categoryName(category.name),
    })),
  ]

  // Which ends still hide families, so an arrow shows only where there is more to see.
  const measure = useCallback(() => {
    const el = scroller.current
    if (!el) return
    setEdges({
      start: el.scrollLeft > 4,
      end: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    })
  }, [])
  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure, items.length])

  // A vertical wheel scrolls the bar sideways, so a mouse without a tilt wheel reaches every family.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    function onWheel(event: WheelEvent) {
      if (!el || Math.abs(event.deltaY) <= Math.abs(event.deltaX) || el.scrollWidth <= el.clientWidth) return
      event.preventDefault()
      el.scrollLeft += event.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function page(direction: 1 | -1) {
    const el = scroller.current
    el?.scrollBy({
      left: direction * el.clientWidth * 0.7,
      behavior: 'smooth',
    })
  }

  const arrow =
    'absolute top-1.5 bottom-1.5 z-10 flex w-9 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200/80 transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-ink'

  return (
    <div className="relative rounded-xl border border-slate-200/80 bg-white">
      {edges.start && (
        <button
          type="button"
          onClick={() => page(-1)}
          aria-label={t('catalog.scrollBack')}
          className={cn(arrow, 'left-1.5 shadow-[6px_0_8px_-4px_rgba(15,23,42,0.12)]')}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
      )}
      {edges.end && (
        <button
          type="button"
          onClick={() => page(1)}
          aria-label={t('catalog.scrollMore')}
          className={cn(arrow, 'right-1.5 shadow-[-6px_0_8px_-4px_rgba(15,23,42,0.12)]')}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      )}
      <div
        ref={scroller}
        onScroll={measure}
        role="group"
        aria-label={t('catalog.type')}
        className="flex gap-1 overflow-x-auto scroll-smooth p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const isSelected = selected === item.value
          const isIncluded = !isSelected && included.has(Number(item.value))
          const count = counts?.[item.id]
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(item.value)}
              className={cn(
                'relative flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                isSelected
                  ? 'font-semibold text-asphalt'
                  : isIncluded
                    ? 'bg-accent-tint font-medium text-slate-900'
                    : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )}
            >
              {isSelected && (
                <motion.span layoutId="activeCategoryPill" className="absolute inset-0 rounded-lg bg-machine" transition={PILL_SPRING} />
              )}
              <span className="relative">{item.name}</span>
              <span className={cn('num relative text-xs', isSelected ? 'text-asphalt/70' : count === 0 ? 'text-slate-300' : 'text-slate-400')}>
                {count === undefined ? '–' : formatNumber(count)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Orders the search endpoint accepts; nearest is the default and stays out of the URL. */
const SORT_OPTIONS = ['NEAREST', 'PRICE_ASC', 'PRICE_DESC', 'NEWEST'] as const
type CatalogSort = (typeof SORT_OPTIONS)[number]

function isCatalogSort(value: string): value is CatalogSort {
  return (SORT_OPTIONS as readonly string[]).includes(value)
}

export default function CatalogPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [, setSearchParams] = useSearchParams()
  const [query] = useQueryParam('q')
  const [categoryId] = useQueryParam('categoryId')
  const [workParam] = useQueryParam('obra')
  const workType = isWorkType(workParam) ? workParam : null
  const [city, setCity] = useQueryParam('city')
  const [brand, setBrand] = useQueryParam('brand')
  const location = useVisitorLocation()
  const toast = useToast()
  // A refused or failed position must be said out loud: the button alone would just stay as it was.
  const previousLocationStatus = useRef(location.status)
  useEffect(() => {
    if (previousLocationStatus.current === 'locating') {
      if (location.status === 'denied') toast.error(t('catalog.locationFailed'), t('catalog.locationDenied'))
      if (location.status === 'unavailable') toast.error(t('catalog.locationFailed'), t('catalog.locationUnavailable'))
      if (location.status === 'ready') toast.success(t('catalog.nearMeOn'))
    }
    previousLocationStatus.current = location.status
  }, [location.status, t, toast])
  const brands = useFetch<string[]>(ENDPOINTS.equipmentBrands)
  const [viewParam, setViewParam] = useQueryParam('view')
  // Dates picked in the landing search: only machines free for the whole range.
  const [startDate] = useQueryParam('startDate')
  const [endDate] = useQueryParam('endDate')
  const [sortParam, setSortParam] = useQueryParam('sort')
  const sort: CatalogSort = isCatalogSort(sortParam) ? sortParam : 'NEAREST'
  // The URL wins (shared links), then the renter's last choice, then the list with the map beside it.
  const [storedView] = useState(readStoredView)
  const chosenView: CatalogView = isCatalogView(viewParam) ? viewParam : (storedView ?? 'split')
  const isWide = useMediaQuery('(min-width: 1024px)')
  const view: CatalogView = chosenView === 'split' && !isWide ? 'grid' : chosenView
  function changeView(next: CatalogView) {
    storeView(next)
    setViewParam(next)
  }
  // Card under the pointer, lit on the map beside the list.
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const { page, size, setPage, setSize } = usePagination()

  const categories = useFetch<EquipmentCategory[]>(ENDPOINTS.categories)
  const filters: CountFilters = {
    q: query || undefined,
    city: city || undefined,
    brand: brand || undefined,
    excludeOwnerId: user?.companyId,
  }
  // With the visitor's position every card says how far it is; the radius covers all of Peru, so sharing
  // the location orders by distance without hiding anything.
  const visitorPosition = location.coords
    ? { latitude: location.coords.latitude, longitude: location.coords.longitude, radiusKm: 1500 }
    : {}
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
    ...visitorPosition,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    sort,
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
  const freeTodayTotal = freeToday.data?.totalElements
  const aiSuggested = useAiSuggested()

  /**
   * A category and a type of work exclude each other, so both change in one write: two setters in a row
   * would each start from the same old query string and the second would undo the first.
   */
  function setFilter(key: 'categoryId' | 'obra', value: string) {
    const other = key === 'categoryId' ? 'obra' : 'categoryId'
    setSearchParams(
      (params) => {
        if (value) {
          params.set(key, value)
          params.delete(other)
        } else {
          params.delete(key)
        }
        params.delete('page')
        return params
      },
      { replace: true },
    )
  }

  const hasFilters = Boolean(query || categoryId || city || workType || brand)
  const total = results.data?.totalElements

  function clearFilters() {
    setSearchParams({}, { replace: true })
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <PageHeader
        title={t('catalog.title')}
        description={query ? t('catalog.resultsFor', { query }) : t('catalog.description')}
        breadcrumbs={[{ label: t('nav.catalog') }]}
      />

      <AiAssistBand />

      <CatalogSearch id="catalog-page-search" className="sm:hidden" />

      <section aria-label={t('catalog.type')} className="space-y-3">
        <WorkTypePills
          selected={workType}
          countFor={(type) => workTypeCount(type, categories.data ?? [], counts)}
          onSelect={(value) => setFilter('obra', value ?? '')}
        />
        {categories.error ? (
          <p className="text-sm text-slate-600">{t('catalog.categoriesError')}</p>
        ) : (
          <CategoryTabs
            categories={categories.data ?? []}
            counts={counts}
            selected={workType && !categoryId ? WORK_TYPE_ACTIVE : categoryId}
            included={new Set(workCategoryIds)}
            onSelect={(value) => setFilter('categoryId', value)}
          />
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="num text-sm text-slate-500" aria-live="polite">
          <span className="text-base font-bold text-slate-900">
            {total === undefined
              ? t('catalog.searching')
              : t('catalog.count', {
                  count: total,
                  formatted: formatNumber(total),
                })}
          </span>
          {city && t('catalog.inCity', { city })}
          {total !== undefined && total > 0 && freeTodayTotal !== undefined && (
            <span className="ml-2.5 inline-flex items-center gap-1.5 text-positive">
              <span className="size-1.5 rounded-full bg-status-green" aria-hidden="true" />
              {t('catalog.freeToday', {
                count: freeTodayTotal,
                formatted: formatNumber(freeTodayTotal),
              })}
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} leftIcon={<FilterX className="size-4" />}>
              {t('catalog.clear')}
            </Button>
          )}
          <ViewToggle view={view} onChange={changeView} />
        </div>
      </div>

      {/* Filters get a row of their own and the selects stretch, so the row is full at every width. */}
      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <label className="relative min-w-44 flex-1">
          <span className="sr-only">{t('catalog.city')}</span>
          <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <select
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className={cn(
              'h-9 w-full appearance-none rounded-lg border bg-white pr-9 pl-9 text-sm text-slate-900 transition-colors hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
              city ? 'border-ink font-semibold' : 'border-slate-200/80',
            )}
          >
            <option value="">{t('catalog.allCities')}</option>
            {PERU_CITIES.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        </label>
        {(brands.data?.length ?? 0) > 0 && (
          <label className="relative min-w-44 flex-1">
            <span className="sr-only">{t('catalog.brand')}</span>
            <Tag className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <select
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              className={cn(
                'h-9 w-full appearance-none rounded-lg border bg-white pr-9 pl-9 text-sm text-slate-900 transition-colors hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                brand ? 'border-ink font-semibold' : 'border-slate-200/80',
              )}
            >
              <option value="">{t('catalog.allBrands')}</option>
              {brands.data?.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          </label>
        )}
        <Button
          variant={location.coords ? 'primary' : 'secondary'}
          size="sm"
          isLoading={location.status === 'locating'}
          aria-pressed={location.coords !== null}
          title={location.status === 'denied' ? t('catalog.locationDenied') : location.coords ? t('catalog.nearMeOn') : undefined}
          onClick={location.coords ? location.clear : location.request}
          leftIcon={<LocateFixed className="size-4" />}
        >
          {location.status === 'locating' ? t('catalog.locating') : t('catalog.nearMe')}
        </Button>
        <label className="relative min-w-44 flex-1">
          <span className="sr-only">{t('catalog.sort')}</span>
          <ArrowDownUp className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <select
            value={sort}
            onChange={(event) => setSortParam(event.target.value === 'NEAREST' ? '' : event.target.value)}
            className={cn(
              'h-9 w-full appearance-none rounded-lg border bg-white pr-9 pl-9 text-sm text-slate-900 transition-colors hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
              sort !== 'NEAREST' ? 'border-ink font-semibold' : 'border-slate-200/80',
            )}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`catalog.sortOptions.${option}`)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        </label>
      </div>

      {results.error && <ErrorState error={results.error} onRetry={results.refetch} />}

      {!results.error && !results.data && <SkeletonLoader variant="card" count={8} />}

      {!results.error && results.data && results.data.totalElements === 0 && (
        <EmptyState
          icon={SearchX}
          title={hasFilters ? t('catalog.noResultsTitle') : t('catalog.emptyTitle')}
          description={hasFilters ? t('catalog.noResultsText') : t('catalog.emptyText')}
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
        <Suspense
          fallback={
            <div className="h-[560px] rounded-2xl border border-slate-200/80 bg-white" aria-busy="true" aria-label={t('catalog.loadingMap')} />
          }
        >
          <EquipmentMap machines={results.data.content} />
        </Suspense>
      )}

      {!results.error && results.data && results.data.totalElements > 0 && view === 'grid' && (
        <>
          <ul
            aria-busy={results.isLoading}
            className={cn('grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', results.isLoading && 'opacity-60')}
          >
            {results.data.content.map((equipment) => (
              <li key={equipment.id}>
                <EquipmentCard equipment={equipment} suggestedByAi={aiSuggested.has(equipment.id)} availableToday={freeTodayIds.has(equipment.id)} />
              </li>
            ))}
          </ul>
          <Pagination pageData={results.data} onPageChange={setPage} onSizeChange={setSize} isDisabled={results.isLoading} />
        </>
      )}

      {!results.error && results.data && results.data.totalElements > 0 && view === 'split' && (
        <div className="space-y-5">
          <aside aria-label={t('catalog.map')} className="relative">
            <Suspense
              fallback={<div className="h-[420px] rounded-2xl border border-slate-200/80 bg-white" aria-busy="true" aria-label={t('catalog.loadingMap')} />}
            >
              <EquipmentMap machines={results.data.content} activeId={hoveredId} className="h-[420px]" />
            </Suspense>
            <button
              type="button"
              onClick={() => changeView('grid')}
              className="absolute top-3 right-3 z-[500] flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-semibold text-slate-900 shadow-md ring-1 ring-slate-200/80 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <PanelRightClose className="size-4" aria-hidden="true" />
              {t('catalog.hideMap')}
            </button>
          </aside>
          <ul
            aria-busy={results.isLoading}
            onMouseLeave={() => setHoveredId(null)}
            className={cn('grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', results.isLoading && 'opacity-60')}
          >
            {results.data.content.map((equipment) => (
              <li key={equipment.id} onMouseEnter={() => setHoveredId(equipment.id)} onFocus={() => setHoveredId(equipment.id)}>
                <EquipmentCard equipment={equipment} suggestedByAi={aiSuggested.has(equipment.id)} availableToday={freeTodayIds.has(equipment.id)} />
              </li>
            ))}
          </ul>
          <Pagination pageData={results.data} onPageChange={setPage} onSizeChange={setSize} isDisabled={results.isLoading} />
        </div>
      )}

      {!results.error && results.data && results.data.totalElements > 0 && view === 'grid' && isWide && (
        <button
          type="button"
          onClick={() => changeView('split')}
          className="fixed bottom-6 left-1/2 z-30 flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-sheet shadow-lg transition-colors hover:bg-ink-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <MapIcon className="size-4" aria-hidden="true" />
          {t('catalog.showMap')}
        </button>
      )}
    </div>
  )
}
