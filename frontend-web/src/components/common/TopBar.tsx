import { motion } from 'framer-motion'
import { Menu, Search, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useDebounce } from '../../hooks/useDebounce'
import { PATHS } from '../../routes/paths'
import { cn } from '../../utils/cn'
import type { WorkspaceMode } from '../../utils/workspaceMode'
import { BrandWordmark } from './BrandMark'
import { FullscreenToggle } from './FullscreenToggle'
import { LanguageMenu } from './LanguageMenu'
import { ModeSwitch } from './ModeSwitch'
import { RefreshButton } from './RefreshButton'
import { ThemeToggle } from './ThemeToggle'

const SEARCH_DEBOUNCE_MS = 400

/**
 * Searches the catalogue from any screen. On the catalogue itself it filters as you type; elsewhere
 * Enter opens the catalogue with the query.
 */
function CatalogSearch({ id, className }: { id: string; className?: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const onCatalog = pathname === PATHS.catalog
  const urlQuery = onCatalog ? (searchParams.get('q') ?? '') : ''

  // The field follows the URL (back button, "Limpiar filtros") without an effect: derived state.
  const [text, setText] = useState(urlQuery)
  const [syncedQuery, setSyncedQuery] = useState(urlQuery)
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery)
    setText(urlQuery)
  }

  const debounced = useDebounce(text.trim(), SEARCH_DEBOUNCE_MS)
  const lastApplied = useRef(debounced)
  useEffect(() => {
    if (!onCatalog || debounced === lastApplied.current) return
    lastApplied.current = debounced
    setSearchParams(
      (params) => {
        if (debounced) params.set('q', debounced)
        else params.delete('q')
        params.delete('page')
        return params
      },
      { replace: true },
    )
  }, [debounced, onCatalog, setSearchParams])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = text.trim()
    if (onCatalog) return
    navigate(query ? `${PATHS.catalog}?q=${encodeURIComponent(query)}` : PATHS.catalog)
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {t('nav.searchLabel')}
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t('nav.searchPlaceholder')}
        autoComplete="off"
        className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-ink transition-colors placeholder:text-slate-500 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/30 focus:outline-none"
      />
    </form>
  )
}

interface TopBarProps {
  mode: WorkspaceMode
  onModeChange: (mode: WorkspaceMode) => void
  onOpenMenu: () => void
  onToggleAssistant: () => void
  isAssistantOpen: boolean
}

/**
 * White header: the mode switcher on the left, the catalogue search in the middle, the assistant and the
 * theme toggle on the right.
 */
export function TopBar({ mode, onModeChange, onOpenMenu, onToggleAssistant, isAssistantOpen }: TopBarProps) {
  const { t } = useTranslation()
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-2 sm:px-4 lg:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t('nav.openMenu')}
        className="flex size-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 lg:hidden"
      >
        <Menu className="size-5" />
      </button>
      <Link to={PATHS.home} className="lg:hidden" aria-label={t('nav.homeLink')}>
        <BrandWordmark />
      </Link>

      <ModeSwitch mode={mode} onChange={onModeChange} className="hidden w-[280px] shrink-0 lg:grid" />
      <CatalogSearch id="topbar-search" className="mx-auto hidden w-full max-w-[480px] sm:block" />

      {/* The advisor is the product's signature: an amber border that breathes (opacity only, so it stays at 60fps). */}
      <motion.button
        type="button"
        onClick={onToggleAssistant}
        aria-expanded={isAssistantOpen}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.96 }}
        className="group relative ml-auto flex h-10 shrink-0 items-center rounded-lg p-[2px] sm:ml-0"
      >
        <span
          aria-hidden="true"
          className="ai-glow absolute inset-0 rounded-lg bg-[linear-gradient(110deg,#f59e0b,#ea580c,#f59e0b)] motion-reduce:animate-none"
        />
        <span
          className={cn(
            'relative flex h-full items-center gap-2 rounded-[6px] bg-[#0f172a] px-3 text-sm font-semibold text-[#f8fafc] transition-colors group-hover:bg-[#1e293b]',
            isAssistantOpen && 'bg-[#1e293b]',
          )}
        >
          <Sparkles className="size-4 text-brand" aria-hidden="true" />
          <span className="hidden sm:inline">{t('nav.assistant')}</span>
          <span className="sr-only sm:hidden">{t('nav.assistantLong')}</span>
        </span>
      </motion.button>
      <RefreshButton />
      <LanguageMenu />
      <FullscreenToggle className="hidden sm:flex" />
      <ThemeToggle />
    </header>
  )
}

export { CatalogSearch }
