import { Check, Languages } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, currentLanguage, type Language } from '../../i18n'
import { cn } from '../../utils/cn'

/** Two-letter code shown on the button and before each option, like the country codes of a phone menu. */
const CODES: Record<Language, string> = { es: 'ES', en: 'EN', zh: 'ZH' }

/** Picks the interface language. The choice is remembered per browser. `dark` sits on the landing's dark hero. */
export function LanguageMenu({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const active = currentLanguage()

  useEffect(() => {
    if (!isOpen) return
    function handlePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  function choose(language: Language) {
    setIsOpen(false)
    if (language !== active) void i18n.changeLanguage(language)
  }

  return (
    <div ref={rootRef} className={cn('relative shrink-0', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={`${t('language.change')}: ${t(`language.${active}`)}`}
        title={t('language.change')}
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-bold transition-colors duration-200',
          tone === 'dark'
            ? 'border-white/15 bg-white/5 text-slate-200 hover:border-white/30 hover:text-white'
            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-ink',
          isOpen && (tone === 'dark' ? 'border-amber-400/60 text-white' : 'border-brand text-ink'),
        )}
      >
        <Languages className="size-4" aria-hidden="true" />
        {CODES[active]}
      </button>
      {isOpen && (
        <ul
          id={menuId}
          role="menu"
          aria-label={t('language.label')}
          className="absolute right-0 z-50 mt-2 w-44 animate-[fade-in_120ms_ease-out] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
        >
          {LANGUAGES.map((language) => {
            const isActive = language === active
            return (
              <li key={language} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  lang={language}
                  onClick={() => choose(language)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-ink transition-colors hover:bg-slate-50',
                    isActive && 'bg-slate-100 font-semibold',
                  )}
                >
                  <span className="w-6 text-xs font-bold text-slate-500">{CODES[language]}</span>
                  <span className="flex-1">{t(`language.${language}`)}</span>
                  {isActive && <Check className="size-4 text-brand" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
