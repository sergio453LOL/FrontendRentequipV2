import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CalendarCheck, HardHat, MapPin, Send, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { buildPath } from '../../routes/paths'
import { assistantService } from '../../services/assistantService'
import type { ChatMessage, ChatRole, EquipmentSummary } from '../../types'
import { rememberSuggested } from '../../utils/aiSuggestions'
import { getErrorMessage } from '../../utils/apiError'
import { cn } from '../../utils/cn'
import { formatCurrency } from '../../utils/format'
import type { WorkspaceMode } from '../../utils/workspaceMode'
import { EquipmentImage } from '../equipment/EquipmentImage'
import { Spinner } from './Spinner'

/** Same limit as the backend guardrail: longer questions are answered locally without calling the model. */
const MAX_MESSAGE_LENGTH = 300
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]

function createMessage(role: ChatRole, content: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date(), ...extra }
}

interface AIChatWidgetProps {
  isOpen: boolean
  onClose: () => void
  /** The one-click prompts follow the side the company is working on. */
  mode: WorkspaceMode
  /** A question to ask as soon as the panel opens (sent from the landing's AI search). */
  initialQuestion?: string | null
  onInitialQuestionAsked?: () => void
}

/**
 * The 24/7 AI advisor, opened from the top bar. Questions go to the backend, which asks Gemini to pick
 * machines from the live catalogue (or uses a local keyword recommender when no model is configured).
 * Recommended machines come back as cards that can be booked straight away.
 */
export function AIChatWidget({ isOpen, onClose, mode, initialQuestion, onInitialQuestionAsked }: AIChatWidgetProps) {
  const { t } = useTranslation()
  // The greeting (always the first message) is drawn from i18n, so it follows the language switch.
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createMessage('assistant', '')])
  const [draft, setDraft] = useState('')
  const [isReplying, setIsReplying] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isReplying, isOpen])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  async function ask(question: string) {
    const text = question.trim()
    if (!text || isReplying) return

    const userMessage = createMessage('user', text)
    // The greeting is UI copy, not part of the conversation the model should see.
    const history = [...messages.slice(1), userMessage]
      .filter((message) => !message.isError)
      .map(({ role, content }) => ({ role, content }))

    setMessages((current) => [...current, userMessage])
    setDraft('')
    setIsReplying(true)
    try {
      const response = await assistantService.chat(history)
      rememberSuggested(response.recommendations.map((equipment) => equipment.id))
      setMessages((current) => [
        ...current,
        createMessage('assistant', response.reply, { recommendations: response.recommendations }),
      ])
    } catch (error) {
      setMessages((current) => [...current, createMessage('assistant', getErrorMessage(error), { isError: true })])
    } finally {
      setIsReplying(false)
    }
  }

  // Ask the landing's question once; the ref survives StrictMode's double effect run.
  const askedQuestionRef = useRef<string | null>(null)
  useEffect(() => {
    if (!isOpen || !initialQuestion || askedQuestionRef.current === initialQuestion) return
    askedQuestionRef.current = initialQuestion
    onInitialQuestionAsked?.()
    void ask(initialQuestion.slice(0, MAX_MESSAGE_LENGTH))
    // `ask` is recreated every render; the question itself is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialQuestion])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void ask(draft)
  }

  const showPrompts = messages.length === 1 && !isReplying
  const prompts =
    mode === 'owner' ? t('assistant.prompts.owner', { returnObjects: true }) : t('assistant.prompts.renter', { returnObjects: true })

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.section
          key="assistant"
          aria-label={t('assistant.title')}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          style={{ transformOrigin: 'top right' }}
          className="fixed top-[72px] right-2 z-40 flex h-[min(40rem,calc(100vh-5rem))] w-[calc(100vw-1rem)] max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/10 sm:right-4"
        >
          <header className="flex items-center gap-3 bg-[#0f172a] px-4 py-3 text-[#f8fafc]">
            <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand text-[#0f172a]">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold">{t('assistant.title')}</h2>
              <p className="flex items-center gap-1.5 text-xs text-[#cbd5e1]">
                <span className="relative flex size-2" aria-hidden="true">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
                  <span className="relative size-2 rounded-full bg-emerald-400" />
                </span>
                {t('assistant.online')}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('assistant.close')}
              className="ml-auto rounded-md p-1.5 text-[#cbd5e1] transition-colors hover:bg-[#1e293b] hover:text-[#f8fafc]"
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4" aria-live="polite">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className={cn('flex flex-col gap-2', message.role === 'user' && 'items-end')}
              >
                <p
                  className={cn(
                    'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                    message.role === 'user' ? 'rounded-br-md bg-[#0f172a] text-[#f8fafc]' : 'rounded-bl-md bg-white text-ink ring-1 ring-slate-200',
                    message.isError && 'bg-red-50 text-red-700 ring-red-100',
                  )}
                >
                  {index === 0 ? t('assistant.greeting') : message.content}
                </p>
                {message.recommendations && message.recommendations.length > 0 && (
                  <ul className="w-full space-y-2.5" aria-label={t('assistant.recommended')}>
                    {message.recommendations.map((equipment, cardIndex) => (
                      <motion.li
                        key={equipment.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.12 + cardIndex * 0.08, ease: EASE_OUT }}
                      >
                        <RecommendationCard equipment={equipment} onOpen={onClose} />
                      </motion.li>
                    ))}
                  </ul>
                )}
              </motion.div>
            ))}

            {showPrompts && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-slate-500">{t('assistant.tryAsking')}</p>
                {prompts.map((prompt, promptIndex) => (
                  <motion.button
                    key={prompt}
                    type="button"
                    onClick={() => void ask(prompt)}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + promptIndex * 0.06, ease: EASE_OUT }}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    className="group flex w-full items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-2.5 text-left text-sm font-medium text-ink ring-1 ring-slate-200 transition-colors hover:bg-accent-tint hover:ring-brand"
                  >
                    {prompt}
                    <ArrowRight className="size-4 shrink-0 text-slate-400 transition-colors group-hover:text-accent-ink" aria-hidden="true" />
                  </motion.button>
                ))}
              </div>
            )}

            {isReplying && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Spinner size="sm" label={t('assistant.thinking')} />
                {t('assistant.searching')}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white p-3 ring-1 ring-slate-200">
            <label htmlFor="ai-chat-input" className="sr-only">
              {t('assistant.inputLabel')}
            </label>
            <input
              id="ai-chat-input"
              ref={inputRef}
              value={draft}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t('assistant.placeholder')}
              autoComplete="off"
              disabled={isReplying}
              className="h-10 flex-1 rounded-lg bg-slate-100 px-3 text-sm text-ink placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-brand focus:outline-none disabled:opacity-60"
            />
            <motion.button
              type="submit"
              whileTap={{ scale: 0.92 }}
              disabled={!draft.trim() || isReplying}
              aria-label={t('assistant.send')}
              className="flex size-10 items-center justify-center rounded-lg bg-brand text-[#0f172a] transition-colors hover:bg-amber-400 disabled:opacity-40"
            >
              <Send className="size-4" />
            </motion.button>
          </form>
        </motion.section>
      )}
    </AnimatePresence>
  )
}

/** A machine the assistant picked: photo, price and a direct way to book it. */
function RecommendationCard({ equipment, onOpen }: { equipment: EquipmentSummary; onOpen: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <article className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 transition-shadow hover:ring-brand">
      <Link to={buildPath.equipmentDetail(equipment.id)} onClick={onOpen} className="flex gap-3 p-2.5">
        <EquipmentImage src={equipment.primaryImageUrl} alt={equipment.name} className="h-20 w-24 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold text-ink">{equipment.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="size-3" aria-hidden="true" /> {equipment.city} · {equipment.ownerCompanyName}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="num text-sm font-bold text-ink">
              {formatCurrency(equipment.dailyRate, equipment.currency)}
              <span className="font-normal text-slate-500"> {t('common.perDay')}</span>
            </p>
            {equipment.operatorIncluded && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-ink">
                <HardHat className="size-3.5" aria-hidden="true" /> {t('tags.operator')}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="px-2.5 pb-2.5">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            onOpen()
            navigate(`${buildPath.equipmentDetail(equipment.id)}?reservar=1`)
          }}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-action text-sm font-semibold text-white transition-colors hover:bg-action-hover"
        >
          <CalendarCheck className="size-4" aria-hidden="true" /> {t('assistant.bookNow')}
        </motion.button>
      </div>
    </article>
  )
}
