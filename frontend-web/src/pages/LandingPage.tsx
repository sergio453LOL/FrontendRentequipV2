import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  ClipboardCheck,
  CreditCard,
  FileDown,
  HardHat,
  MapPin,
  Search,
  Sparkles,
  Upload,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArticleRow, LeadArticle } from '../components/blog/BlogCards'
import { EquipmentImage } from '../components/equipment/EquipmentImage'
import { AiSearchShowcase } from '../components/landing/AiSearchShowcase'
import { AnimatedNumber } from '../components/landing/AnimatedNumber'
import { LandingHero } from '../components/landing/LandingHero'
import { SiteFooter, SiteHeader } from '../components/landing/SiteChrome'
import { BLOG_ARTICLES } from '../content/blog'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import { buildPath, PATHS } from '../routes/paths'
import { ENDPOINTS } from '../services/endpoints'
import type { EquipmentCategory, EquipmentSummary, PageResponse } from '../types'
import { formatCurrency, formatNumber } from '../utils/format'
import { MODE_HOME, readStoredMode, storeMode, type WorkspaceMode } from '../utils/workspaceMode'
import { ScrollToTopButton } from '../components/common/ScrollToTopButton'

const TOOLS_CATEGORY = 'herramientas'
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]

const integer = (value: number) => formatNumber(Math.round(value))

/** White card with a precision border: the one surface of the page. */
const CARD = 'rounded-2xl border border-slate-200/80 bg-white shadow-sm'

/** The three newest guides: one leads the landing's guides section, two follow beside it. */
const latestGuides = [...BLOG_ARTICLES].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)

export default function LandingPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  // The visitor picks a side before signing in; the panel opens on the same side afterwards.
  const [mode, setMode] = useState<WorkspaceMode>(readStoredMode)
  function changeMode(next: WorkspaceMode) {
    setMode(next)
    storeMode(next)
  }
  // The API pages at 100: the live figures read up to three pages, enough for the demo catalogue.
  const catalog = useFetch<PageResponse<EquipmentSummary>>(ENDPOINTS.equipmentSearch, { page: 0, size: 100 })
  const totalPages = catalog.data?.totalPages ?? 0
  const page2 = useFetch<PageResponse<EquipmentSummary>>(totalPages > 1 ? ENDPOINTS.equipmentSearch : null, { page: 1, size: 100 })
  const page3 = useFetch<PageResponse<EquipmentSummary>>(totalPages > 2 ? ENDPOINTS.equipmentSearch : null, { page: 2, size: 100 })
  const allPagesLoaded = (totalPages <= 1 || page2.data !== null || page2.error !== null) && (totalPages <= 2 || page3.data !== null || page3.error !== null)
  const categories = useFetch<EquipmentCategory[]>(ENDPOINTS.categories)

  // Tools carry the general "Herramientas" tag besides their own category; everything else counts as machinery.
  const toolsCategory = categories.data?.find((category) => category.name.toLowerCase() === TOOLS_CATEGORY)
  const tools = useFetch<PageResponse<EquipmentSummary>>(toolsCategory ? ENDPOINTS.equipmentSearch : null, {
    page: 0,
    size: 1,
    categoryId: toolsCategory?.id,
  })
  const toolCount = toolsCategory ? tools.data?.totalElements : 0

  const machines = [...(catalog.data?.content ?? []), ...(page2.data?.content ?? []), ...(page3.data?.content ?? [])]
  const cities = [...new Set(machines.map((machine) => machine.city))].sort()
  const stats = catalog.data && allPagesLoaded && toolCount !== undefined
    ? [
        { label: t('landing.stats.machines'), value: catalog.data.totalElements - toolCount, format: integer },
        { label: t('landing.stats.tools'), value: toolCount, format: integer },
        { label: t('landing.stats.companies'), value: new Set(machines.map((machine) => machine.ownerCompanyId)).size, format: integer },
        { label: t('landing.stats.cities'), value: cities.length, format: integer },
        {
          label: t('landing.stats.from'),
          value: machines.length > 0 ? Math.min(...machines.map((machine) => machine.dailyRate)) : 0,
          format: (value: number) => formatCurrency(Math.round(value), machines[0]?.currency ?? 'PEN').replace(/\.00$/, ''),
        },
      ]
    : []
  const featured = machines.slice(0, 6)
  const appHome = MODE_HOME[mode]

  return (
    <div className="theme-light min-h-screen bg-slate-50 text-ink">
      <SiteHeader
        appHome={appHome}
        nav={
          <>
            <a href="#maquinaria" className="transition-colors hover:text-ink">
              {t('landing.navMachinery')}
            </a>
            <a href="#como-funciona" className="transition-colors hover:text-ink">
              {t('landing.navHowItWorks')}
            </a>
            <a href="#guias" className="transition-colors hover:text-ink">
              {t('blog.nav')}
            </a>
            <a href="#buscador-ia" className="inline-flex items-center gap-1.5 font-medium text-ink underline decoration-machine decoration-[3px] underline-offset-[6px] transition-colors hover:decoration-asphalt">
              <Sparkles className="size-4" aria-hidden="true" /> {t('landing.navAi')}
            </a>
          </>
        }
      />

      <LandingHero
        mode={mode}
        onModeChange={changeMode}
        categories={categories.data ?? []}
        cities={cities}
        isAuthenticated={isAuthenticated}
      />

      <AiSearchShowcase isAuthenticated={isAuthenticated} />

      {/* ------------------------------------------------------- live stats */}
      <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <motion.dl
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-5"
          aria-label={t('landing.liveData')}
        >
          {(stats.length > 0 ? stats : [0, 1, 2, 3, 4]).map((stat, index) =>
            typeof stat === 'number' ? (
              <div key={index} className={`h-[92px] last:col-span-2 sm:last:col-span-1 ${CARD}`} aria-hidden="true" />
            ) : (
              // Five tiles on two columns: the last one takes the full width on phones.
              <div key={stat.label} className={`px-5 py-4 last:col-span-2 sm:last:col-span-1 ${CARD}`}>
                <dd className="num text-3xl font-bold tracking-tight text-[#0f172a]">
                  <AnimatedNumber value={stat.value} format={stat.format} delay={index * 0.12} />
                </dd>
                <dt className="mt-1 text-sm text-slate-500">{stat.label}</dt>
              </div>
            ),
          )}
        </motion.dl>
      </section>

      {/* --------------------------------------------------------- machines */}
      <section id="maquinaria" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-bold tracking-tight text-[#0f172a]">{t('landing.featuredTitle')}</h2>
          <Link to={PATHS.catalog} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-ink underline decoration-machine decoration-2 underline-offset-4">
            {t('landing.seeCatalog')} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>

        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((machine, index) => (
            <motion.li
              key={machine.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease: EASE_OUT }}
            >
              <Link
                to={buildPath.equipmentDetail(machine.id)}
                className={`group block overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${CARD}`}
              >
                <div className="relative overflow-hidden">
                  <EquipmentImage
                    src={machine.primaryImageUrl}
                    alt={machine.name}
                    className="aspect-[4/3] w-full transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  {machine.operatorIncluded && (
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-machine px-2.5 py-1 text-sm font-semibold text-asphalt">
                      <HardHat className="size-3.5" aria-hidden="true" /> {t('tags.operator')}
                    </span>
                  )}
                </div>
                <div className="flex items-end justify-between gap-3 p-5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#0f172a]">{machine.name}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                      <MapPin className="size-3.5" aria-hidden="true" /> {machine.city}
                    </p>
                  </div>
                  <p className="num shrink-0 text-right text-lg font-bold text-[#0f172a]">
                    {formatCurrency(machine.dailyRate, machine.currency)}
                    <span className="block text-xs font-medium text-slate-500">{t('landing.perDay')}</span>
                  </p>
                </div>
              </Link>
            </motion.li>
          ))}
        </ul>
        {catalog.error && <p className="mt-6 text-sm text-slate-500">{t('landing.catalogError')}</p>}
      </section>

      {/* ----------------------------------------------------- how it works */}
      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-8 px-4 pb-20 sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-[#0f172a]">{t('landing.howTitle')}</h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {[
            {
              title: t('modes.renter.title'),
              subtitle: t('modes.renter.caption'),
              steps: [Search, CalendarCheck, CreditCard, FileDown].map((icon, index) => ({
                icon,
                text: t('landing.renterSteps', { returnObjects: true })[index],
              })),
            },
            {
              title: t('modes.owner.title'),
              subtitle: t('modes.owner.caption'),
              steps: [Upload, ClipboardCheck, BarChart3, CalendarCheck].map((icon, index) => ({
                icon,
                text: t('landing.ownerSteps', { returnObjects: true })[index],
              })),
            },
          ].map((side, sideIndex) => (
            <motion.article
              key={side.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: sideIndex * 0.1, ease: EASE_OUT }}
              className={`p-6 sm:p-8 ${CARD}`}
            >
              <p className="text-sm font-semibold text-slate-500">{side.subtitle}</p>
              <h3 className="mt-1 text-2xl font-bold text-[#0f172a]">{side.title}</h3>
              <ol className="mt-6 space-y-4">
                {side.steps.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <Icon className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden="true" />
                    <span className="text-slate-700">{text}</span>
                  </li>
                ))}
              </ol>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- guides */}
      {/* The newest guide large on the left, the next two as a list beside it: an editorial page, not a card row. */}
      <section id="guias" aria-labelledby="guias-title" className="scroll-mt-8 bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h2 id="guias-title" className="text-3xl font-bold tracking-tight text-[#0f172a]">
                {t('blog.landingTitle')}
              </h2>
              <p className="mt-3 text-lg leading-8 text-slate-700">{t('blog.landingText')}</p>
            </div>
            <Link to={PATHS.blog} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-ink underline decoration-machine decoration-2 underline-offset-4">
              {t('blog.seeAll')} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-10 grid gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease: EASE_OUT }}
            >
              <LeadArticle article={latestGuides[0]} />
            </motion.div>
            <ul className="space-y-8 lg:pt-1">
              {latestGuides.slice(1).map((article, index) => (
                <motion.li
                  key={article.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.6, delay: 0.1 + index * 0.08, ease: EASE_OUT }}
                >
                  <ArticleRow article={article} />
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- CTA */}
      {/* Closing field in machine yellow, flat floor to edge: the page ends on the colour of the machines. */}
      <section className="bg-machine text-asphalt">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-20 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:py-24">
          <div className="max-w-2xl">
            <h2 className="text-3xl leading-[1.05] font-bold tracking-[-0.025em] text-balance sm:text-5xl">{t('landing.ctaTitle')}</h2>
            <p className="mt-4 text-lg text-asphalt">{t('landing.ctaText')}</p>
          </div>
          <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} className="inline-flex">
            <Link
              to={isAuthenticated ? PATHS.publishEquipment : PATHS.register}
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-asphalt px-6 text-base font-semibold whitespace-nowrap text-white transition-colors hover:bg-asphalt-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-asphalt"
            >
              {isAuthenticated ? t('landing.ctaPublish') : t('landing.ctaRegister')} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </motion.span>
        </div>
      </section>

      <SiteFooter />
      <ScrollToTopButton />
    </div>
  )
}
