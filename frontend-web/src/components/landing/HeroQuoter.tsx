import { animate, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Calculator, HardHat } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useFetch } from '../../hooks/useFetch'
import { PATHS } from '../../routes/paths'
import { ENDPOINTS } from '../../services/endpoints'
import type { EquipmentCategory, EquipmentSummary, PageResponse } from '../../types'
import { categoryName } from '../../utils/categoryName'
import { formatCurrency } from '../../utils/format'

const MAX_DAYS = 30
const DAY_PRESETS = [1, 7, 15, 30] as const
const DEFAULT_CATEGORY = 'Excavadoras'

interface HeroQuoterProps {
  categories: EquipmentCategory[]
  /** Cities that have machines today, taken from the live catalogue. */
  cities: string[]
}

/** Money that glides from the old figure to the new one, so changing a filter reads as a recalculation. */
function TweenedMoney({ value, currency }: { value: number; currency: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const previous = useRef(value)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const format = (amount: number) => formatCurrency(Math.round(amount), currency).replace(/\.00$/, '')
    if (reduceMotion) {
      node.textContent = format(value)
      previous.current = value
      return
    }
    const controls = animate(previous.current, value, {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        node.textContent = format(latest)
      },
    })
    previous.current = value
    return () => controls.stop()
  }, [value, currency, reduceMotion])

  return <span ref={ref}>{formatCurrency(Math.round(value), currency).replace(/\.00$/, '')}</span>
}

/**
 * Category + city + days = what the rental costs, from the rates owners really published. The estimate is
 * a range (cheapest and typical machine), never a promise; the button opens exactly those machines.
 */
export function HeroQuoter({ categories, cities }: HeroQuoterProps) {
  const { t } = useTranslation()
  const ids = useId()
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [city, setCity] = useState('')
  const [days, setDays] = useState(7)
  // Heavy machinery first: excavators are what the headline promises.
  const chosenCategory =
    categoryId ?? categories.find((category) => category.name === DEFAULT_CATEGORY)?.id ?? categories[0]?.id ?? null

  const offers = useFetch<PageResponse<EquipmentSummary>>(chosenCategory ? ENDPOINTS.equipmentSearch : null, {
    page: 0,
    size: 100,
    categoryId: chosenCategory ?? undefined,
    city: city || undefined,
  })
  const rates = (offers.data?.content ?? []).map((machine) => machine.dailyRate).sort((a, b) => a - b)
  const cheapest = rates[0] ?? 0
  const typical = rates.length > 0 ? rates[Math.floor(rates.length / 2)] : 0
  const currency = offers.data?.content[0]?.currency ?? 'PEN'
  const withOperator = (offers.data?.content ?? []).filter((machine) => machine.operatorIncluded).length
  const catalogLink = `${PATHS.catalog}?categoryId=${chosenCategory ?? ''}${city ? `&city=${encodeURIComponent(city)}` : ''}`

  const selectClass =
    'h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-[#0f172a] transition-colors hover:border-slate-300 focus:border-brand focus:bg-white focus:ring-2 focus:ring-amber-200 focus:outline-none'

  return (
    <motion.form
      onSubmit={(event) => event.preventDefault()}
      aria-labelledby={`${ids}-title`}
      // A working piece of the product, not page chrome: it keeps its own controls and labels.
      data-ui="quoter"
      className="relative w-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-7"
    >
      <h2 id={`${ids}-title`} className="flex items-center gap-2 text-lg font-bold text-[#0f172a]">
        <Calculator className="size-5 text-action" aria-hidden="true" /> {t('quoter.title')}
      </h2>
      <p className="mt-1 text-sm text-slate-500">{t('quoter.text')}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${ids}-category`} className="mb-1.5 block text-sm font-semibold text-slate-700">
            {t('quoter.category')}
          </label>
          <select
            id={`${ids}-category`}
            value={chosenCategory ?? ''}
            onChange={(event) => setCategoryId(Number(event.target.value))}
            className={selectClass}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {categoryName(category.name)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${ids}-city`} className="mb-1.5 block text-sm font-semibold text-slate-700">
            {t('quoter.city')}
          </label>
          <select id={`${ids}-city`} value={city} onChange={(event) => setCity(event.target.value)} className={selectClass}>
            <option value="">{t('quoter.anyCity')}</option>
            {cities.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between">
          <label htmlFor={`${ids}-days`} className="text-sm font-semibold text-slate-700">
            {t('quoter.days')}
          </label>
          <span className="num text-sm font-bold text-[#0f172a]">{t('quoter.daysValue', { count: days })}</span>
        </div>
        <input
          id={`${ids}-days`}
          type="range"
          min={1}
          max={MAX_DAYS}
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
          className="h-2 w-full cursor-pointer accent-[#f59e0b]"
        />
        <div className="mt-2 flex gap-2" role="group" aria-label={t('quoter.presets')}>
          {DAY_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setDays(preset)}
              aria-pressed={days === preset}
              className={
                days === preset
                  ? 'h-9 flex-1 rounded-md bg-brand text-sm font-bold text-[#0f172a]'
                  : 'h-9 flex-1 rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300'
              }
            >
              {t('quoter.daysValue', { count: preset })}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200/80 bg-slate-50 p-4 sm:p-5" aria-live="polite">
        {offers.isLoading && rates.length === 0 ? (
          <div className="h-[88px] animate-pulse rounded-lg bg-slate-100" aria-label={t('quoter.calculating')} />
        ) : rates.length === 0 ? (
          <p className="text-sm text-slate-500">{t('quoter.none')}</p>
        ) : (
          <>
            <p className="text-sm text-slate-500">{t('quoter.estimate', { count: days })}</p>
            <p className="num mt-1 text-3xl font-bold tracking-tight text-[#0f172a] sm:text-4xl">
              <TweenedMoney value={cheapest * days} currency={currency} />
              {typical > cheapest && (
                <span className="text-slate-500">
                  {' – '}
                  <TweenedMoney value={typical * days} currency={currency} />
                </span>
              )}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
              <span>{t('quoter.basis', { count: rates.length })}</span>
              {withOperator > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-action-ink">
                  <HardHat className="size-4" aria-hidden="true" /> {t('quoter.withOperator', { count: withOperator })}
                </span>
              )}
            </p>
          </>
        )}
      </div>

      <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="mt-5 block">
        <Link
          to={catalogLink}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-action text-sm font-bold text-white transition-colors hover:bg-action-hover"
        >
          {rates.length > 0 ? t('quoter.see', { count: rates.length }) : t('quoter.seeCatalog')}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </motion.span>
    </motion.form>
  )
}
