import { AnimatePresence, motion, useInView, useReducedMotion, type Variants } from 'framer-motion'
import { ArrowRight, BadgeCheck, Clock, MapPin, MessageSquareText, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useFetch } from '../../hooks/useFetch'
import { PATHS } from '../../routes/paths'
import { ENDPOINTS } from '../../services/endpoints'
import type { EquipmentSummary, PageResponse } from '../../types'
import { ASSISTANT_PARAM } from '../../utils/assistantLink'
import { cn } from '../../utils/cn'
import { formatCurrency } from '../../utils/format'
import { storeMode } from '../../utils/workspaceMode'
import { EquipmentImage } from '../equipment/EquipmentImage'

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const rise: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE_OUT } },
}
const MAX_QUESTION_LENGTH = 300
const TYPE_MS = 32
const SEARCH_MS = 1100
const HOLD_MS = 4800

/**
 * The demo conversations: the question and the answer are scripted (labelled "example"), the machines are
 * real listings fetched from the public catalogue search with `query` and `city`.
 */
const SCENARIOS = [
  { key: 'trench', query: 'Excavadora Caterpillar', city: 'Lima' },
  { key: 'compact', query: 'Rodillo', city: '' },
  { key: 'debris', query: 'Minicargador', city: 'Callao' },
] as const

type Phase = 'typing' | 'searching' | 'answer'

const money = (amount: number, currency: string) => formatCurrency(Math.round(amount), currency).replace(/\.00$/, '')

function useScenarioMachines(query: string, city: string) {
  const result = useFetch<PageResponse<EquipmentSummary>>(ENDPOINTS.equipmentSearch, {
    q: query,
    city: city || undefined,
    page: 0,
    size: 2,
  })
  return result.data?.content ?? []
}

/** The chat card on the right: a question typed out, the catalogue search, then the advisor's picks. */
function DemoChat() {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { margin: '-80px' })
  const reduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [typedCount, setTyped] = useState(0)
  const [currentPhase, setPhase] = useState<Phase>('typing')
  const machines = [
    useScenarioMachines(SCENARIOS[0].query, SCENARIOS[0].city),
    useScenarioMachines(SCENARIOS[1].query, SCENARIOS[1].city),
    useScenarioMachines(SCENARIOS[2].query, SCENARIOS[2].city),
  ]
  const scenario = SCENARIOS[index]
  const question = t(`landing.ai.demo.${scenario.key}.question`)
  const picks = machines[index]
  // Reduced motion: no typing, the whole exchange shows at once (the dots still switch examples).
  const typed = reduceMotion ? question.length : typedCount
  const phase: Phase = reduceMotion ? 'answer' : currentPhase

  // One small state machine: type the question, search, answer, hold, next scenario. Paused off screen.
  useEffect(() => {
    if (!isInView || reduceMotion) return
    let timer: number
    if (phase === 'typing') {
      timer = window.setTimeout(
        () => (typed < question.length ? setTyped(typed + 1) : setPhase('searching')),
        typed < question.length ? TYPE_MS : 350,
      )
    } else if (phase === 'searching') {
      timer = window.setTimeout(() => setPhase('answer'), SEARCH_MS)
    } else {
      timer = window.setTimeout(() => {
        setIndex((index + 1) % SCENARIOS.length)
        setTyped(0)
        setPhase('typing')
      }, HOLD_MS)
    }
    return () => window.clearTimeout(timer)
  }, [index, isInView, phase, question.length, reduceMotion, typed])

  function jumpTo(next: number) {
    setIndex(next)
    setTyped(0)
    setPhase('typing')
  }

  return (
    <div ref={ref} className="relative">
      {/* Dark product panel on the night grid: a raised tone and a 1px edge, no glow. */}
      <div className="overflow-hidden rounded-2xl bg-asphalt-raised ring-1 ring-white/12">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
          <span className="flex size-10 items-center justify-center rounded-lg bg-machine text-asphalt">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-bold text-white">{t('assistant.title')}</p>
            <p className="flex items-center gap-1.5 text-xs text-[#9aa5b8]">
              <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" />
              {t('assistant.online')}
            </p>
          </div>
          <span className="ml-auto rounded-md bg-white/8 px-2 py-1 text-xs font-medium text-[#9aa5b8]">{t('landing.ai.example')}</span>
        </div>

        <div className="h-[372px] space-y-3 overflow-hidden p-4" aria-live="off">
          {/* The visitor's question, typed out. */}
          <div className="flex justify-end">
            <p className="max-w-[88%] rounded-2xl rounded-br-md bg-asphalt px-4 py-2.5 text-[15px] leading-relaxed text-white ring-1 ring-white/10">
              {question.slice(0, typed)}
              {phase === 'typing' && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-machine" aria-hidden="true" />}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {phase === 'searching' && (
              <motion.p
                key="searching"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-xs text-[#9aa5b8]"
              >
                <span className="flex gap-1" aria-hidden="true">
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      className="size-1.5 rounded-full bg-machine"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.15 }}
                    />
                  ))}
                </span>
                {t('assistant.searching')}
              </motion.p>
            )}
            {phase === 'answer' && (
              <motion.div key={`answer-${index}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }} className="space-y-2.5">
                <p className="max-w-[92%] rounded-2xl rounded-bl-md px-4 py-2.5 text-[15px] leading-relaxed text-[#e4e8ef] ring-1 ring-white/15">
                  {t(`landing.ai.demo.${scenario.key}.answer`)}
                </p>
                {picks.map((machine, cardIndex) => (
                  <motion.div
                    key={machine.id}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.25 + cardIndex * 0.12, ease: EASE_OUT }}
                    className="flex items-center gap-3 rounded-xl bg-asphalt p-2 ring-1 ring-white/10"
                  >
                    <EquipmentImage src={machine.primaryImageUrl} alt={machine.name} className="h-16 w-20 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-white">{machine.name}</p>
                      <p className="flex items-center gap-1 text-xs text-[#9aa5b8]">
                        <MapPin className="size-3" aria-hidden="true" /> {machine.city}
                      </p>
                    </div>
                    <p className="num shrink-0 pr-2 text-right font-bold text-white">
                      {money(machine.dailyRate, machine.currency)}
                      <span className="block text-[11px] font-normal text-[#9aa5b8]">{t('landing.perDay')}</span>
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-5 flex justify-center gap-2" role="group" aria-label={t('landing.ai.examples')}>
        {SCENARIOS.map((item, dot) => (
          <button
            key={item.key}
            type="button"
            onClick={() => jumpTo(dot)}
            aria-label={t(`landing.ai.demo.${item.key}.question`)}
            aria-pressed={dot === index}
            className={cn('h-2 rounded-full transition-all duration-300', dot === index ? 'w-8 bg-machine' : 'w-2 bg-white/25 hover:bg-white/50')}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * RentEquip's differentiator: describe the job in plain words and the AI advisor picks machines from the
 * live catalogue. The question travels to the renter panel, which opens the advisor and asks it.
 */
export function AiSearchShowcase({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [question, setQuestion] = useState('')
  const suggestions = t('landing.ai.suggestions', { returnObjects: true }) as string[]
  const suggestionLabels = t('landing.ai.suggestionLabels', { returnObjects: true }) as string[]

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = question.trim()
    if (!text) return
    storeMode('renter')
    navigate(`${PATHS.catalog}?${ASSISTANT_PARAM}=${encodeURIComponent(text)}`)
  }

  const features = [
    { key: 'natural', icon: MessageSquareText },
    { key: 'real', icon: BadgeCheck },
    { key: 'fast', icon: Clock },
  ] as const

  return (
    // Night field with a site-plan grid and hard edges: the one dark surface of the light landing. No fades or
    // glows; the impact comes from the cut against the light page, the large two-tone title and the yellow.
    <section
      id="buscador-ia"
      className="plan-grid relative overflow-hidden text-white selection:bg-machine selection:text-asphalt"
    >
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-14 lg:py-28">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
          <motion.h2 variants={rise} className="text-[2.05rem] leading-[1.04] font-bold tracking-[-0.03em] sm:text-[3.4rem] lg:text-[3.3rem] xl:text-[3.75rem]">
            <span className="block">{t('landing.ai.titleStart')}</span>
            <span className="block text-machine">{t('landing.ai.titleHighlight')}</span>
          </motion.h2>
          <motion.p variants={rise} className="mt-6 max-w-xl text-lg leading-relaxed text-[#c9d1de] sm:text-[21px]">
            {t('landing.ai.text')}
          </motion.p>

          <motion.form
            variants={rise}
            onSubmit={handleSubmit}
            className="mt-9 flex flex-col gap-2 rounded-2xl bg-white p-2 ring-[3px] ring-machine sm:flex-row sm:items-center"
          >
            <label htmlFor="landing-ai-question" className="sr-only">
              {t('landing.ai.inputLabel')}
            </label>
            <input
              id="landing-ai-question"
              value={question}
              maxLength={MAX_QUESTION_LENGTH}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={t('landing.ai.placeholder')}
              autoComplete="off"
              className="h-14 min-w-0 flex-1 bg-transparent px-4 text-lg text-asphalt caret-asphalt placeholder:text-slate-500 focus:outline-none"
            />
            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              disabled={!question.trim()}
              className="inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-xl bg-machine px-6 text-lg font-bold text-asphalt transition-colors hover:bg-machine-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-asphalt disabled:cursor-not-allowed disabled:hover:bg-machine"
            >
              {t('landing.ai.ask')} <ArrowRight className="size-5" aria-hidden="true" />
            </motion.button>
          </motion.form>

          {/* Short labels fill the field with the full question, so the visitor sees how to phrase it. */}
          <motion.p variants={rise} className="mt-5 text-[17px] text-[#c9d1de]">
            {t('landing.ai.try')}{' '}
            {suggestions.map((suggestion, index) => (
              <span key={suggestion}>
                {index > 0 && <span aria-hidden="true"> · </span>}
                <button
                  type="button"
                  onClick={() => setQuestion(suggestion)}
                  className="text-machine underline decoration-machine/60 decoration-1 underline-offset-4 transition-colors hover:decoration-machine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-machine"
                >
                  {suggestionLabels[index] ?? suggestion}
                </button>
              </span>
            ))}
          </motion.p>
          {!isAuthenticated && (
            <motion.p variants={rise} className="mt-3 text-sm text-[#9aa5b8]">
              {t('landing.ai.freeNote')}
            </motion.p>
          )}

          <motion.ul variants={rise} className="mt-14 grid gap-7 sm:grid-cols-3 sm:gap-6">
            {features.map(({ key, icon: Icon }) => (
              <li key={key}>
                <Icon className="size-7 text-machine" strokeWidth={1.75} aria-hidden="true" />
                <p className="mt-3 text-lg font-bold">{t(`landing.ai.features.${key}.title`)}</p>
                <p className="mt-1 leading-relaxed text-[#c9d1de]">{t(`landing.ai.features.${key}.text`)}</p>
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE_OUT }}
        >
          <DemoChat />
        </motion.div>
      </div>
    </section>
  )
}
