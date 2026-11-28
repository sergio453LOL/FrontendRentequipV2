import { motion } from 'framer-motion'
import { ArrowRight, RotateCcw, Send } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { adminAssistantService, type CopilotSource } from '../../services/adminAssistantService'
import { getErrorMessage } from '../../utils/apiError'
import { cn } from '../../utils/cn'
import { Spinner } from '../common/Spinner'
import { Drawer } from './AdminUi'

/** Same limit as the backend's request validation. */
const MAX_MESSAGE_LENGTH = 1000
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]

interface CopilotMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  source?: CopilotSource
  asOf?: string
  isError?: boolean
}

/**
 * The platform copilot, opened from the panel's top bar: the team asks about companies, the catalogue,
 * reservations or money in its own words, and the backend answers from the figures it reads at that
 * moment (Gemini or Claude; a plain summary of the main figures when no model can answer). The
 * conversation stays while the panel is open, across modules.
 */
export function AdminCopilot({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [draft, setDraft] = useState('')
  const [isReplying, setIsReplying] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isReplying])

  useEffect(() => {
    if (!isOpen) return
    // The drawer focuses its panel first; the question box is what the admin wants.
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  async function ask(question: string) {
    const text = question.trim()
    if (!text || isReplying) return
    const userMessage: CopilotMessage = { id: crypto.randomUUID(), role: 'user', content: text }
    const history = [...messages, userMessage].filter((message) => !message.isError).map(({ role, content }) => ({ role, content }))

    setMessages((current) => [...current, userMessage])
    setDraft('')
    setIsReplying(true)
    try {
      const answer = await adminAssistantService.chat(history)
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'assistant', content: answer.reply, source: answer.source, asOf: answer.asOf },
      ])
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', content: getErrorMessage(error), isError: true }])
    } finally {
      setIsReplying(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void ask(draft)
  }

  function startOver() {
    setMessages([])
    setDraft('')
    inputRef.current?.focus()
  }

  const timeFormat = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' })
  const prompts = t('admin.copilot.prompts', { returnObjects: true })

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={t('admin.copilot.title')}
      subtitle={
        <span className="flex flex-wrap items-center justify-between gap-2">
          {t('admin.copilot.subtitle')}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={startOver}
              disabled={isReplying}
              className="inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-700 disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {t('admin.copilot.newChat')}
            </button>
          )}
        </span>
      }
      footer={
        <form onSubmit={handleSubmit} className="flex w-full items-end gap-2">
          <label htmlFor="admin-copilot-input" className="sr-only">
            {t('admin.copilot.inputLabel')}
          </label>
          <textarea
            id="admin-copilot-input"
            ref={inputRef}
            rows={2}
            value={draft}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter asks; Shift+Enter writes a new line.
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                void ask(draft)
              }
            }}
            placeholder={t('admin.copilot.placeholder')}
            disabled={isReplying}
            className="min-h-11 flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-slate-900 focus:ring-2 focus:ring-brand/60 focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isReplying}
            className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink-hover disabled:opacity-40"
          >
            <Send className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('admin.copilot.send')}</span>
            <span className="sr-only sm:hidden">{t('admin.copilot.send')}</span>
          </button>
        </form>
      }
    >
      <div className="space-y-4" aria-live="polite">
        <p className="max-w-[92%] rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-2.5 text-sm leading-relaxed text-slate-800">{t('admin.copilot.greeting')}</p>

        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">{t('admin.copilot.tryAsking')}</p>
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void ask(prompt)}
                className="group flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm font-medium text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50"
              >
                {prompt}
                <ArrowRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}

        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className={cn('flex flex-col gap-1', message.role === 'user' && 'items-end')}
          >
            <p
              className={cn(
                'max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                message.role === 'user' ? 'rounded-br-md bg-ink text-white' : 'rounded-bl-md bg-slate-100 text-slate-800',
                message.isError && 'bg-red-50 text-red-700',
              )}
            >
              {message.content}
            </p>
            {/* A guard reply read no figures, so it has no source or time to show. */}
            {message.source && message.source !== 'guardrail' && message.asOf && (
              <p className="px-1 text-xs text-slate-500">
                {t('admin.copilot.asOf', { source: t(`admin.copilot.sources.${message.source}`), time: timeFormat.format(new Date(message.asOf)) })}
              </p>
            )}
          </motion.div>
        ))}

        {isReplying && (
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Spinner size="sm" label={t('admin.copilot.thinking')} />
            {t('admin.copilot.thinking')}
          </p>
        )}
        <div ref={endRef} />
      </div>
    </Drawer>
  )
}
