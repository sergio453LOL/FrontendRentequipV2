import { motion } from 'framer-motion'
import {
  ArrowLeftRight,
  BrainCircuit,
  Building2,
  Landmark,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Truck,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Suspense, useCallback, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useFetch } from '../../hooks/useFetch'
import { useSidebarCollapsed } from '../../hooks/useSidebarCollapsed'
import { PATHS } from '../../routes/paths'
import { ENDPOINTS } from '../../services/endpoints'
import type { User } from '../../types'
import { cn } from '../../utils/cn'
import { BrandMark } from '../common/BrandMark'
import { ErrorBoundary } from '../common/ErrorBoundary'
import { LanguageMenu } from '../common/LanguageMenu'
import { OfflineBanner } from '../common/OfflineBanner'
import { RefreshButton } from '../common/RefreshButton'
import { FullPageSpinner } from '../common/Spinner'
import { ThemeToggle } from '../common/ThemeToggle'
import { Avatar } from '../profile/Avatar'
import { SearchField } from './AdminUi'

type ModuleKey = 'dashboard' | 'companies' | 'movements' | 'catalog' | 'marketing' | 'ai' | 'finance'

interface AdminModule {
  key: ModuleKey
  to: string
  icon: LucideIcon
  /** Runs on demonstration data (marked in the menu and the title row). */
  demo: boolean
}

/** The panel's modules in three groups; labels in i18n `admin.nav`. */
const GROUPS: { key: 'operation' | 'growth' | 'money'; modules: AdminModule[] }[] = [
  {
    key: 'operation',
    modules: [
      { key: 'dashboard', to: PATHS.admin, icon: LayoutDashboard, demo: true },
      { key: 'companies', to: PATHS.adminCompanies, icon: Building2, demo: false },
      { key: 'movements', to: PATHS.adminMovements, icon: ArrowLeftRight, demo: true },
    ],
  },
  {
    key: 'growth',
    modules: [
      { key: 'catalog', to: PATHS.adminCatalog, icon: Truck, demo: false },
      { key: 'marketing', to: PATHS.adminMarketing, icon: Megaphone, demo: true },
      { key: 'ai', to: PATHS.adminAi, icon: BrainCircuit, demo: true },
    ],
  },
  { key: 'money', modules: [{ key: 'finance', to: PATHS.adminFinance, icon: Landmark, demo: true }] },
]

const MODULES = GROUPS.flatMap((group) => group.modules)

function AdminSidebar({ isOpen, onClose, isCollapsed, onToggleCollapsed }: { isOpen: boolean; onClose: () => void; isCollapsed: boolean; onToggleCollapsed: () => void }) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const me = useFetch<User>(user ? ENDPOINTS.me : null)
  const displayName = me.data ? `${me.data.firstName} ${me.data.lastName}` : (user?.email ?? '')
  const hiddenWhenCollapsed = isCollapsed && 'lg:hidden'
  const collapseLabel = isCollapsed ? t('nav.expandMenu') : t('nav.collapseMenu')
  const CollapseIcon = isCollapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <aside
      className={cn(
        'theme-light z-40 flex-col bg-ink text-slate-300',
        'fixed inset-0 lg:sticky lg:top-0 lg:flex lg:h-screen lg:shrink-0 lg:overflow-hidden lg:transition-[width] lg:duration-200',
        isCollapsed ? 'lg:w-[72px]' : 'lg:w-[264px]',
        isOpen ? 'flex' : 'hidden',
      )}
    >
      <div className={cn('flex h-14 items-center gap-2.5 px-5', isCollapsed && 'lg:justify-center lg:px-0')}>
        <Link to={PATHS.admin} onClick={onClose} className="flex min-w-0 items-center gap-2.5" aria-label={t('admin.homeLink')}>
          <BrandMark className="size-7 shrink-0 text-brand" />
          <span className={cn('min-w-0 leading-tight', hiddenWhenCollapsed)}>
            <span className="block text-[15px] font-bold tracking-tight text-white">RentEquip</span>
            <span className="block text-xs text-slate-400">{t('admin.scope')}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('nav.closeMenu')}
          className="ml-auto flex size-10 items-center justify-center rounded-md text-slate-300 hover:bg-white/10 lg:hidden"
        >
          <X className="size-5" />
        </button>
      </div>

      <nav aria-label={t('admin.nav.label')} className="flex-1 overflow-y-auto px-3 pt-2 pb-3">
        {GROUPS.map((group, groupIndex) => (
          <div key={group.key} className="mt-3 first:mt-1">
            <p className={cn('px-3 pb-1.5 text-xs font-medium text-slate-400', hiddenWhenCollapsed)}>{t(`admin.nav.groups.${group.key}`)}</p>
            {isCollapsed && groupIndex > 0 && <div className="mx-3 mb-2 hidden h-px bg-white/10 lg:block" aria-hidden="true" />}
            <ul className="flex flex-col gap-0.5">
              {group.modules.map((module) => {
                const isActive = module.to === PATHS.admin ? pathname === PATHS.admin : pathname.startsWith(module.to)
                const Icon = module.icon
                const label = t(`admin.nav.${module.key}`)
                return (
                  <li key={module.key}>
                    <NavLink
                      to={module.to}
                      end={module.to === PATHS.admin}
                      onClick={onClose}
                      title={isCollapsed ? label : undefined}
                      className={cn(
                        'relative flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150',
                        'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand',
                        isCollapsed && 'lg:justify-center lg:px-0',
                        isActive ? 'text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="admin-nav-active"
                          className="absolute inset-0 rounded-md bg-ink-hover"
                          transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                        >
                          <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand" />
                        </motion.span>
                      )}
                      <Icon className={cn('relative size-[18px] shrink-0', isActive && 'text-brand')} strokeWidth={1.75} aria-hidden="true" />
                      <span className={cn('relative min-w-0 flex-1 truncate', isCollapsed && 'lg:sr-only')}>{label}</span>
                      {/* Demo modules carry a hollow dot: discreet in the menu, spelled out in each title row. */}
                      {module.demo && (
                        <span className={cn('relative size-1.5 shrink-0 rounded-full ring-1 ring-slate-400', hiddenWhenCollapsed)} title={t('admin.demo.badge')}>
                          <span className="sr-only">{t('admin.demo.badge')}</span>
                        </span>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        <p className={cn('mt-4 flex items-center gap-2 px-3 text-xs text-slate-400', hiddenWhenCollapsed)} aria-hidden="true">
          <span className="size-1.5 rounded-full ring-1 ring-slate-400" />
          {t('admin.demo.badge')}
        </p>
      </nav>

      <div className="flex flex-col gap-0.5 px-3 pb-2">
        <Link
          to={PATHS.home}
          onClick={onClose}
          title={isCollapsed ? t('admin.backToApp') : undefined}
          className={cn('flex h-9 items-center gap-3 rounded-md px-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white', isCollapsed && 'lg:justify-center lg:px-0')}
        >
          <Undo2 className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
          <span className={cn('truncate', isCollapsed && 'lg:sr-only')}>{t('admin.backToApp')}</span>
        </Link>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapseLabel}
          aria-expanded={!isCollapsed}
          title={collapseLabel}
          className={cn('hidden h-9 items-center gap-3 rounded-md px-3 text-sm text-slate-400 hover:bg-white/5 hover:text-white lg:flex', isCollapsed && 'lg:justify-center lg:px-0')}
        >
          <CollapseIcon className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
          <span className={cn('truncate', hiddenWhenCollapsed)}>{collapseLabel}</span>
        </button>
      </div>

      {user && (
        <div className={cn('flex items-center gap-2 border-t border-white/10 px-5 py-3.5', isCollapsed && 'lg:flex-col lg:gap-1 lg:px-0')}>
          <Avatar name={displayName} src={me.data?.avatarUrl} size="sm" tone="dark" />
          <span className={cn('min-w-0 flex-1', hiddenWhenCollapsed)}>
            <span className="block truncate text-sm font-medium text-white">{displayName}</span>
            <span className="block truncate text-xs text-slate-400">{t('admin.role')}</span>
          </span>
          <button
            type="button"
            onClick={logout}
            aria-label={t('nav.logout')}
            title={t('nav.logout')}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      )}
    </aside>
  )
}

function AdminTopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [query, setQuery] = useState('')
  const current = MODULES.find((module) => (module.to === PATHS.admin ? pathname === PATHS.admin : pathname.startsWith(module.to)))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = query.trim()
    if (!text) return
    // Equipment names start with a family of machine; anything else is looked up among companies.
    const target = /^(excavadora|retro|minicargador|rodillo|grúa|grua|plataforma|manipulador|generador|martillo|plancha|cargador|motoniveladora|tractor|andamio)/i.test(text)
      ? PATHS.adminCatalog
      : PATHS.adminCompanies
    navigate(`${target}?q=${encodeURIComponent(text)}`)
    setQuery('')
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200/80 bg-white px-2 sm:gap-3 sm:px-4 lg:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t('nav.openMenu')}
        className="flex size-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 lg:hidden"
      >
        <Menu className="size-5" />
      </button>
      <nav aria-label={t('nav.breadcrumbs')} className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
        <Link to={PATHS.admin} className="text-slate-500 hover:text-slate-900">
          {t('admin.scope')}
        </Link>
        {current && current.key !== 'dashboard' && (
          <>
            <span className="text-slate-300" aria-hidden="true">
              /
            </span>
            <span className="truncate font-medium text-slate-900">{t(`admin.nav.${current.key}`)}</span>
          </>
        )}
      </nav>
      <form role="search" onSubmit={handleSubmit} className="mx-auto w-full max-w-[420px] min-w-0 flex-1">
        <SearchField id="admin-search" value={query} onChange={setQuery} placeholder={t('admin.topbar.search')} />
      </form>
      <Link
        to={PATHS.home}
        className="hidden h-9 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 xl:flex"
      >
        <Undo2 className="size-4" strokeWidth={1.75} aria-hidden="true" />
        {t('admin.backToApp')}
      </Link>
      <RefreshButton />
      <LanguageMenu className="hidden sm:block" />
      <ThemeToggle />
    </header>
  )
}

/**
 * Shell of the platform panel: the asphalt sidebar of the app with the panel's modules, a white top bar
 * with the global search, and each module on the slate ground.
 */
export function AdminLayout() {
  const { pathname } = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCollapsed, toggleCollapsed] = useSidebarCollapsed()
  const openMenu = useCallback(() => setIsMenuOpen(true), [])
  const closeMenu = useCallback(() => setIsMenuOpen(false), [])

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <AdminSidebar isOpen={isMenuOpen} onClose={closeMenu} isCollapsed={isCollapsed} onToggleCollapsed={toggleCollapsed} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <AdminTopBar onOpenMenu={openMenu} />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <ErrorBoundary key={pathname} inline>
            <Suspense fallback={<FullPageSpinner />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
