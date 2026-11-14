import { animate, motion, useReducedMotion } from 'framer-motion'
import { Plus, TrendingUp } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PATHS } from '../../routes/paths'
import { formatCurrency } from '../../utils/format'

const DAYS_PER_MONTH = 30

interface PotentialIncomeProps {
  /** Average daily rate of the company's fleet, the starting point for the new machine's rate. */
  suggestedRate: number
  /** The fleet's real occupancy over the next 30 days (0–1), the starting point for the new machine's. */
  currentOccupancy: number
  currency: string
  canPublish: boolean
}

function Money({ value, currency }: { value: number; currency: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const previous = useRef(value)
  const reduceMotion = useReducedMotion()
  const format = (amount: number) => formatCurrency(Math.round(amount), currency).replace(/\.00$/, '')

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (reduceMotion) {
      node.textContent = format(value)
      previous.current = value
      return
    }
    const controls = animate(previous.current, value, {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        node.textContent = format(latest)
      },
    })
    previous.current = value
    return () => controls.stop()
    // `format` only depends on currency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, currency, reduceMotion])

  return <span ref={ref}>{format(value)}</span>
}

/**
 * "What would one more machine earn me?" The owner sets its daily rate and how busy it would be; the
 * starting values are the fleet's own average rate and real occupancy, so the first answer is grounded.
 */
export function PotentialIncome({ suggestedRate, currentOccupancy, currency, canPublish }: PotentialIncomeProps) {
  const { t } = useTranslation()
  const ids = useId()
  const [rate, setRate] = useState(() => Math.max(50, Math.round(suggestedRate / 10) * 10 || 300))
  const [occupancy, setOccupancy] = useState(() => Math.round((currentOccupancy > 0 ? currentOccupancy : 0.5) * 100))
  const monthly = rate * DAYS_PER_MONTH * (occupancy / 100)

  return (
    <section
      aria-labelledby={`${ids}-title`}
      className="flex min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-6"
    >
      <h2 id={`${ids}-title`} className="flex items-center gap-2 text-base font-bold text-ink">
        <TrendingUp className="size-5 text-action" aria-hidden="true" /> {t('dashboard.potential.title')}
      </h2>
      <p className="mt-1 text-sm text-slate-500">{t('dashboard.potential.text')}</p>

      <div className="mt-5 space-y-5">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor={`${ids}-rate`} className="text-sm font-semibold text-slate-700">
              {t('dashboard.potential.rate')}
            </label>
            <span className="num text-sm font-bold text-ink">{formatCurrency(rate, currency).replace(/\.00$/, '')}</span>
          </div>
          <input
            id={`${ids}-rate`}
            type="range"
            min={50}
            max={3000}
            step={10}
            value={rate}
            onChange={(event) => setRate(Number(event.target.value))}
            className="h-2 w-full cursor-pointer accent-[#f59e0b]"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor={`${ids}-occupancy`} className="text-sm font-semibold text-slate-700">
              {t('dashboard.potential.occupancy')}
            </label>
            <span className="num text-sm font-bold text-ink">{occupancy}%</span>
          </div>
          <input
            id={`${ids}-occupancy`}
            type="range"
            min={5}
            max={100}
            step={5}
            value={occupancy}
            onChange={(event) => setOccupancy(Number(event.target.value))}
            className="h-2 w-full cursor-pointer accent-[#f59e0b]"
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200/80 bg-slate-50 p-4" aria-live="polite">
        <p className="text-sm text-slate-500">{t('dashboard.potential.monthly')}</p>
        <p className="num mt-1 text-4xl font-bold tracking-tight text-ink">
          <Money value={monthly} currency={currency} />
        </p>
        <p className="num mt-1 text-sm text-slate-500">
          {t('dashboard.potential.yearly')} <Money value={monthly * 12} currency={currency} />
        </p>
      </div>

      {canPublish && (
        <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="mt-5 block">
          <Link
            to={PATHS.publishEquipment}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-action text-sm font-bold text-white transition-colors hover:bg-action-hover"
          >
            <Plus className="size-4" aria-hidden="true" /> {t('dashboard.potential.cta')}
          </Link>
        </motion.span>
      )}
    </section>
  )
}
