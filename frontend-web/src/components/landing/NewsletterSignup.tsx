import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CircleCheck, Loader2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../services/api'
import { ENDPOINTS } from '../../services/endpoints'
import { ApiError } from '../../utils/apiError'
import { cn } from '../../utils/cn'

interface SubscriptionResponse {
  email: string
  alreadySubscribed: boolean
}

type FormState = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; email: string; already: boolean } | { kind: 'error'; message: string }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** "Hear about offers first": an email box with its consent tick, for the dark footer of the landing page. */
export function NewsletterSignup() {
  const { t } = useTranslation()
  const id = useId()
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<FormState>({ kind: 'idle' })

  async function submit(event: FormEvent) {
    event.preventDefault()
    const value = email.trim()
    if (!EMAIL_PATTERN.test(value)) {
      setState({ kind: 'error', message: t('landing.newsletter.invalidEmail') })
      return
    }
    if (!consent) {
      setState({ kind: 'error', message: t('landing.newsletter.consentRequired') })
      return
    }
    setState({ kind: 'sending' })
    try {
      const { data } = await api.post<SubscriptionResponse>(ENDPOINTS.newsletterSubscriptions, { email: value, consent })
      setState({ kind: 'done', email: data.email, already: data.alreadySubscribed })
    } catch (error) {
      setState({ kind: 'error', message: ApiError.from(error).message })
    }
  }

  return (
    <div className="w-full max-w-md">
      <h2 id={`${id}-title`} className="text-lg leading-snug font-bold text-balance text-white">
        {t('landing.newsletter.title')}
      </h2>
      <AnimatePresence mode="wait" initial={false}>
        {state.kind === 'done' ? (
          <motion.p
            key="done"
            role="status"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-start gap-2.5 rounded-lg bg-white/5 px-4 py-3 text-sm leading-6 text-white ring-1 ring-white/10"
          >
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-machine" aria-hidden="true" />
            <span>
              {state.already
                ? t('landing.newsletter.already', { email: state.email })
                : t('landing.newsletter.done', { email: state.email })}
            </span>
          </motion.p>
        ) : (
          <motion.form key="form" onSubmit={submit} noValidate aria-labelledby={`${id}-title`} exit={{ opacity: 0, y: -4 }} className="mt-4 space-y-3">
            <div
              className={cn(
                'flex h-12 overflow-hidden rounded-lg bg-white ring-2 transition-shadow focus-within:ring-machine',
                state.kind === 'error' ? 'ring-red-400' : 'ring-transparent',
              )}
            >
              <label htmlFor={`${id}-email`} className="sr-only">
                {t('landing.newsletter.emailLabel')}
              </label>
              <input
                id={`${id}-email`}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (state.kind === 'error') setState({ kind: 'idle' })
                }}
                placeholder={t('landing.newsletter.placeholder')}
                aria-invalid={state.kind === 'error'}
                aria-describedby={state.kind === 'error' ? `${id}-error` : undefined}
                maxLength={160}
                className="min-w-0 flex-1 bg-transparent px-4 text-[15px] text-asphalt placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={state.kind === 'sending'}
                aria-label={t('landing.newsletter.submit')}
                className="flex w-14 shrink-0 items-center justify-center bg-machine text-asphalt transition-colors hover:bg-machine-hover focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-asphalt disabled:cursor-wait"
              >
                {state.kind === 'sending' ? (
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight className="size-5" aria-hidden="true" />
                )}
              </button>
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-5 text-[#c9ccd1]">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => {
                  setConsent(event.target.checked)
                  if (state.kind === 'error') setState({ kind: 'idle' })
                }}
                className="mt-0.5 size-4 shrink-0 cursor-pointer rounded accent-machine"
              />
              <span>{t('landing.newsletter.consent')}</span>
            </label>
            {state.kind === 'error' && (
              <p id={`${id}-error`} role="alert" className="text-sm text-red-300">
                {state.message}
              </p>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
