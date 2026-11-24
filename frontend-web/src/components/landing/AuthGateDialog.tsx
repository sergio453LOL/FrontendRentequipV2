import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { LoginLocationState } from '../../contexts/AuthContextDefinition'
import { PATHS } from '../../routes/paths'
import { BrandMark } from '../common/BrandMark'

const PHOTO = `${import.meta.env.BASE_URL}images/excavadora-cat-320.jpg`

interface AuthGateDialogProps {
  isOpen: boolean
  /** What the visitor asked, shown back so they know it is kept for after they sign in. */
  question: string
  /** Where to land once logged in or registered: the advisor with the question already asked. */
  returnTo: string
  onClose: () => void
}

/**
 * Shown when a visitor without a session asks the AI advisor: a split dialog with the machine on the left
 * and the two ways in on the right. Both carry `returnTo`, so after logging in or creating the account the
 * visitor lands on the advisor answering the question they typed, without typing it again.
 */
export function AuthGateDialog({ isOpen, question, returnTo, onClose }: AuthGateDialogProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const textId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstActionRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    firstActionRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      // Keeps Tab inside the dialog while it is open.
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const state: LoginLocationState = { from: returnTo }

  return createPortal(
    // theme-light: like the landing it opens from, the dialog keeps its one light look in dark mode (the portal
    // leaves the landing's tree, so it needs the class itself).
    <div className="theme-light fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-[fade-in_150ms_ease-out] bg-asphalt/80"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
        className="relative grid w-full max-w-3xl animate-[slide-up_200ms_ease-out] overflow-hidden rounded-t-2xl bg-white shadow-[0_24px_60px_rgba(13,20,36,0.35)] sm:rounded-2xl md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
      >
        {/* The machine and the visitor's own question: proof that it is kept, not lost behind the login. */}
        {/* Machine yellow, not asphalt: the AI section behind is asphalt, and the panel must stand out from it. */}
        <div className="relative hidden flex-col bg-machine text-asphalt md:flex">
          <img src={PHOTO} alt={t('landing.ai.gate.photoAlt')} className="aspect-[4/3] w-full object-cover" />
          <div className="flex flex-1 flex-col justify-end gap-3 p-7">
            <BrandMark className="size-8 text-asphalt" />
            <p className="text-sm font-medium text-asphalt/75">{t('landing.ai.gate.questionLabel')}</p>
            <p className="text-xl leading-snug font-bold">“{question}”</p>
          </div>
        </div>

        <div className="flex flex-col p-7 sm:p-10">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="absolute top-4 right-4 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-asphalt focus-visible:outline-2 focus-visible:outline-asphalt"
          >
            <X className="size-5" aria-hidden="true" />
          </button>

          <h2 id={titleId} className="pr-8 text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-asphalt">
            {t('landing.ai.gate.title')}
          </h2>
          <p id={textId} className="mt-3 text-base leading-relaxed text-slate-700">
            {t('landing.ai.loginNote')}
          </p>
          {/* On a phone the photo panel is hidden, so the question is echoed here instead. */}
          <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-[15px] font-medium text-asphalt md:hidden">
            “{question}”
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              ref={firstActionRef}
              to={PATHS.register}
              state={state}
              className="inline-flex h-13 items-center justify-center rounded-xl bg-machine px-6 text-lg font-bold text-asphalt transition-[background-color,transform] hover:bg-machine-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-asphalt active:scale-[0.98]"
            >
              {t('landing.ai.gate.register')}
            </Link>
            <Link
              to={PATHS.login}
              state={state}
              className="inline-flex h-13 items-center justify-center rounded-xl bg-slate-100 px-6 text-lg font-semibold text-asphalt transition-[background-color,transform] hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-asphalt active:scale-[0.98]"
            >
              {t('landing.ai.gate.login')}
            </Link>
          </div>

          <p className="mt-6 text-sm text-slate-600">{t('landing.ai.freeNote')}</p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
