import { AnimatePresence, motion, type Variants } from 'framer-motion'
import {
  BadgeCheck,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  HardHat,
  MapPin,
  Search,
  ShieldCheck,
  Truck,
  Upload,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useFetch } from '../../hooks/useFetch'
import { buildPath, PATHS } from '../../routes/paths'
import { ENDPOINTS } from '../../services/endpoints'
import type { EquipmentCategory, EquipmentSummary, PageResponse } from '../../types'
import { formatCurrency, todayIso } from '../../utils/format'
import { cn } from '../../utils/cn'
import type { WorkspaceMode } from '../../utils/workspaceMode'
import { DemoAccessButton } from '../common/DemoAccessButton'
import { EquipmentImage } from '../equipment/EquipmentImage'

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]
// BASE_URL keeps public files working when the app is served from a sub-path (GitHub Pages).
const HERO_PHOTO = `${import.meta.env.BASE_URL}images/excavadora-cat-320.jpg`
const DEFAULT_CITY = 'Lima'

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
}

/** Quick chips under the search: label key and the catalogue category each one opens. */
const QUICK_CATEGORIES = [
  { key: 'excavator', category: 'Excavadoras' },
  { key: 'backhoe', category: 'Retroexcavadoras' },
  { key: 'skidSteer', category: 'Minicargadores' },
  { key: 'crane', category: 'Elevación' },
  { key: 'roller', category: 'Compactación' },
] as const

const TRUST = [
  { key: 'verified', icon: BadgeCheck },
  { key: 'operator', icon: HardHat },
  { key: 'delivery', icon: Truck },
  { key: 'insurance', icon: ShieldCheck },
] as const

const money = (amount: number, currency: string) => formatCurrency(Math.round(amount), currency).replace(/\.00$/, '')
const shortName = (name: string) => name.replace('Caterpillar', 'CAT')

/** One segment of the search bar: small label on top, icon and control below. */
function Segment({ label, icon, children, className }: { label: string; icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative flex min-w-0 flex-col justify-center px-4 py-3 sm:py-2', className)}>
      <span className="text-[15px] font-medium text-ink">{label}</span>
      <div className="mt-1 flex min-w-0 items-center gap-2 text-slate-600">
        <span className="shrink-0 text-slate-500">{icon}</span>
        {children}
      </div>
    </div>
  )
}

/** Date range picker behind the "Fechas" segment: two native date inputs in a small popover. */
function DatesField({ start, end, onChange }: { start: string; end: string; onChange: (start: string, end: string) => void }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const today = todayIso()

  useEffect(() => {
    if (!open) return
    function close(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  const short = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })
  const summary = start && end ? `${short(start)} – ${short(end)}` : start ? short(start) : t('landing.hero.datesPlaceholder')

  return (
    <div ref={ref} className="min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn('w-full truncate text-left text-[17px] focus:outline-none', start ? 'text-ink' : 'text-slate-600')}
      >
        {summary}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute top-full left-0 z-30 mt-3 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
          >
            {(
              [
                ['from', start, (value: string) => onChange(value, end && end < value ? '' : end), today],
                ['to', end, (value: string) => onChange(start, value), start || today],
              ] as const
            ).map(([key, value, set, min]) => (
              <label key={key} className="mb-3 block text-sm font-semibold text-slate-700 last:mb-0">
                {t(`landing.hero.${key}`)}
                <input
                  type="date"
                  value={value}
                  min={min}
                  onChange={(event) => set(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-ink focus:border-asphalt focus:outline-none"
                />
              </label>
            ))}
            <div className="mt-3 flex justify-between">
              <button type="button" onClick={() => onChange('', '')} className="text-sm font-semibold text-slate-500 hover:text-ink">
                {t('landing.hero.clearDates')}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md bg-machine px-3 py-1 text-sm font-semibold text-asphalt hover:bg-machine-hover">
                {t('landing.hero.done')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function RenterSearch({ cities }: { cities: string[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [city, setCity] = useState(DEFAULT_CITY)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const cityOptions = cities.includes(city) || !city ? cities : [city, ...cities]

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (city) params.set('city', city)
    if (start) params.set('startDate', start)
    if (start || end) params.set('endDate', end || start)
    const search = params.toString()
    navigate(search ? `${PATHS.catalog}?${search}` : PATHS.catalog)
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="grid rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.18)] sm:grid-cols-[1.3fr_1fr_1.05fr_auto] sm:items-center"
    >
      <Segment label={t('landing.hero.what')} icon={<Search className="size-5" aria-hidden="true" />}>
        <input
          aria-label={t('landing.searchLabel')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('landing.hero.whatPlaceholder')}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[17px] text-ink placeholder:text-slate-600 focus:outline-none"
        />
      </Segment>

      <Segment
        label={t('landing.hero.city')}
        icon={<MapPin className="size-5" aria-hidden="true" />}
        className="border-t border-slate-200 sm:border-t-0 sm:border-l"
      >
        <div className="min-w-0 flex-1">
          <select
            aria-label={t('landing.hero.city')}
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="w-full cursor-pointer appearance-none truncate bg-transparent text-[17px] text-ink focus:outline-none"
          >
            <option value="">{t('landing.hero.anyCity')}</option>
            {cityOptions.map((name) => (
              <option key={name} value={name}>
                {t('landing.hero.cityValue', { city: name })}
              </option>
            ))}
          </select>
          <span className="block text-[13px] leading-tight text-slate-500">{t('landing.hero.cityHint')}</span>
        </div>
      </Segment>

      <Segment
        label={t('landing.hero.dates')}
        icon={<CalendarDays className="size-5" aria-hidden="true" />}
        className="border-t border-slate-200 sm:border-t-0 sm:border-l"
      >
        <DatesField
          start={start}
          end={end}
          onChange={(nextStart, nextEnd) => {
            setStart(nextStart)
            setEnd(nextEnd)
          }}
        />
      </Segment>

      <motion.button
        type="submit"
        whileTap={{ scale: 0.97 }}
        className="mt-2 h-12 rounded-xl bg-machine px-6 text-base font-semibold text-asphalt transition-colors hover:bg-machine-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-asphalt sm:mt-0 sm:mr-1"
      >
        {t('landing.search')}
      </motion.button>
    </form>
  )
}

/** Owner side of the hero: the same bar, describing the three steps and leading to publishing. */
function OwnerBar({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { t } = useTranslation()
  const steps = [
    { key: 'publish', icon: Upload },
    { key: 'approve', icon: ClipboardCheck },
    { key: 'collect', icon: CreditCard },
  ] as const
  return (
    <div className="grid rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.18)] sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center">
      {steps.map(({ key, icon: Icon }, index) => (
        <Segment
          key={key}
          label={t(`landing.hero.owner.${key}.title`)}
          icon={<Icon className="size-5" aria-hidden="true" />}
          className={index > 0 ? 'border-t border-slate-200 sm:border-t-0 sm:border-l' : undefined}
        >
          <span className="truncate text-[15px]">{t(`landing.hero.owner.${key}.text`)}</span>
        </Segment>
      ))}
      <Link
        to={isAuthenticated ? PATHS.publishEquipment : PATHS.register}
        className="mt-2 inline-flex h-12 items-center justify-center rounded-xl bg-machine px-6 text-base font-semibold whitespace-nowrap text-asphalt transition-colors hover:bg-machine-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-asphalt sm:mt-0 sm:mr-1"
      >
        {t('landing.hero.owner.cta')}
      </Link>
    </div>
  )
}

/** A live machine floating over the photo: picture, name, daily rate and "available today". */
function FloatingCard({ machine, layout, className, delay }: { machine: EquipmentSummary; layout: 'stacked' | 'row'; className?: string; delay: number }) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay, ease: EASE_OUT }}
      className={cn('absolute z-10', className)}
    >
      <Link
        to={buildPath.equipmentDetail(machine.id)}
        className={cn(
          'block rounded-xl border border-slate-200/70 bg-white p-2.5 shadow-[0_18px_40px_-14px_rgba(15,23,42,0.35)] transition-transform duration-300 hover:-translate-y-1',
          layout === 'row' && 'flex items-center gap-3',
        )}
      >
        <EquipmentImage
          src={machine.primaryImageUrl}
          alt={machine.name}
          className={cn('rounded-lg', layout === 'stacked' ? 'aspect-[16/9] w-full' : 'h-[78px] w-[118px] shrink-0')}
        />
        <div className={cn('min-w-0', layout === 'stacked' ? 'px-1 pt-2.5 pb-0.5' : 'pr-2')}>
          <p className="truncate text-[15px] text-slate-800">{shortName(machine.name)}</p>
          <p className="num mt-0.5 text-slate-700">
            <span className="text-lg font-bold text-ink">{money(machine.dailyRate, machine.currency)}</span>
            <span className="text-[15px]"> / {t('landing.hero.day')}</span>
          </p>
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[13px] text-emerald-800">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            {t('landing.hero.availableToday')}
          </span>
        </div>
      </Link>
    </motion.div>
  )
}

/** Picks the machine to show: one free today, in Lima when there is one. */
function useFeatured(query: string) {
  const today = todayIso()
  const result = useFetch<PageResponse<EquipmentSummary>>(ENDPOINTS.equipmentSearch, {
    q: query,
    startDate: today,
    endDate: today,
    page: 0,
    size: 50,
  })
  const machines = result.data?.content ?? []
  return machines.find((machine) => machine.city === DEFAULT_CITY) ?? machines[0] ?? null
}

interface LandingHeroProps {
  mode: WorkspaceMode
  onModeChange: (mode: WorkspaceMode) => void
  categories: EquipmentCategory[]
  cities: string[]
  isAuthenticated: boolean
}

export function LandingHero({ mode, onModeChange, categories, cities, isAuthenticated }: LandingHeroProps) {
  const { t } = useTranslation()
  const excavator = useFeatured('Caterpillar 320')
  const skidSteer = useFeatured('Bobcat')
  const categoryId = (name: string) => categories.find((category) => category.name === name)?.id
  const [firstWord, ...rest] = t('landing.heroTitle').split(' ')
  const restOfTitle = rest.join(' ')

  return (
    <section className="relative overflow-hidden">
      {/* The photo bleeds off the right edge; its left side starts just right of the centre line. */}
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, ease: EASE_OUT }}
        className="pointer-events-none absolute top-0 right-0 hidden h-[562px] overflow-hidden rounded-bl-[32px] lg:block lg:left-[calc(50%+150px)] xl:left-[calc(50%+215px)]"
      >
        {/* Zoomed in on the machine so it fills the panel. */}
        <img
          src={HERO_PHOTO}
          alt=""
          className="size-full origin-[30%_62%] scale-[1.22] object-cover [object-position:22%_50%]"
          fetchPriority="high"
        />
        {/* Soft fade so the top-left of the sky melts into the page ground. */}
        <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-slate-50/70 to-transparent" />
      </motion.div>

      {excavator && (
        <FloatingCard
          machine={excavator}
          layout="stacked"
          delay={0.45}
          className="top-[102px] hidden w-[176px] lg:left-[calc(50%+70px)] lg:block xl:left-[calc(50%+127px)]"
        />
      )}
      {skidSteer && (
        <FloatingCard
          machine={skidSteer}
          layout="row"
          delay={0.6}
          className="top-[422px] hidden w-[340px] lg:left-[calc(50%+120px)] lg:block xl:left-[calc(50%+179px)]"
        />
      )}

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div variants={stagger} initial="hidden" animate="show" className="pt-10 pb-8 lg:min-h-[562px] lg:max-w-[690px] lg:pt-[52px]">
          <motion.div
            variants={fadeUp}
            role="radiogroup"
            aria-label={t('modes.perspective')}
            className="inline-flex rounded-full border border-slate-200 bg-slate-100/80 p-1"
          >
            {(['renter', 'owner'] as const).map((option) => {
              const active = mode === option
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => !active && onModeChange(option)}
                  className={cn(
                    'relative h-9 rounded-full px-5 text-[16px] font-medium transition-colors',
                    active ? 'text-white' : 'text-slate-500 hover:text-ink',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="landing-mode"
                      className="absolute inset-0 rounded-full bg-asphalt"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative">{t(`landing.hero.mode.${option}`)}</span>
                </button>
              )
            })}
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-5 text-[2.75rem] leading-[1.02] font-bold tracking-[-0.03em] text-ink sm:text-6xl lg:text-[4.7rem] lg:whitespace-nowrap"
          >
            {/* First word on its own line, the promise on the second ("Maquinaria / pesada, al instante"). */}
            {firstWord}
            {restOfTitle && (
              <>
                <br className="hidden sm:block" /> {restOfTitle}
              </>
            )}
          </motion.h1>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
            >
              <p className="mt-5 text-lg text-slate-500 sm:text-[22px]">
                {mode === 'renter' ? t('landing.heroText') : t('landing.hero.ownerText')}
              </p>
              <div className="mt-10">
                {mode === 'renter' ? <RenterSearch cities={cities} /> : <OwnerBar isAuthenticated={isAuthenticated} />}
              </div>
              {mode === 'renter' && (
                <nav aria-label={t('landing.quickFilter')} className="mt-5 flex flex-wrap gap-2.5">
                  {QUICK_CATEGORIES.map(({ key, category }) => {
                    const id = categoryId(category)
                    return (
                      <Link
                        key={key}
                        to={id ? `${PATHS.catalog}?categoryId=${id}` : PATHS.catalog}
                        className="inline-flex h-9 items-center rounded-full border border-slate-400/80 bg-white/60 px-4 text-[16px] text-slate-700 transition-colors hover:border-ink hover:text-ink"
                      >
                        {t(`landing.hero.chips.${key}`)}
                      </Link>
                    )
                  })}
                </nav>
              )}
            </motion.div>
          </AnimatePresence>

          {!isAuthenticated && (
            <motion.p variants={fadeUp} className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[16px] text-slate-600">
              {t('demo.heroLine')} <DemoAccessButton variant="link" />
            </motion.p>
          )}

          {/* Phones and tablets: the photo sits under the search instead of beside it. */}
          <img src={HERO_PHOTO} alt="" className="mt-8 h-56 w-full rounded-2xl object-cover sm:h-72 lg:hidden" />
        </motion.div>

        <motion.ul
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: EASE_OUT }}
          className="mt-[38px] grid grid-cols-2 gap-y-4 border-y border-slate-400/70 py-4 lg:flex lg:items-center lg:justify-between lg:py-[18px]"
        >
          {TRUST.map(({ key, icon: Icon }, index) => (
            <li key={key} className="flex items-center gap-3 lg:contents">
              {index > 0 && <span className="hidden h-9 w-px bg-slate-400/80 lg:block" aria-hidden="true" />}
              <span className="flex items-center gap-3 lg:px-2">
                <Icon className="size-7 shrink-0 text-ink" strokeWidth={1.6} aria-hidden="true" />
                <span className="text-[15px] text-slate-800 sm:text-[19px]">{t(`landing.hero.trust.${key}`)}</span>
              </span>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}
