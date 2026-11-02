import { LogOut, PanelLeftClose, PanelLeftOpen, X, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { PATHS } from '../../routes/paths'
import type { UserRole } from '../../types'
import { cn } from '../../utils/cn'
import type { WorkspaceMode } from '../../utils/workspaceMode'
import { BrandMark } from './BrandMark'
import { ModeSwitch } from './ModeSwitch'
import { CatalogSearch } from './TopBar'

export interface SidebarItem {
  label: string
  /** Path, optionally with a query string (`/reservations?role=OWNER`). */
  to: string
  icon: LucideIcon
  allowedRoles?: UserRole[]
}

interface SidebarProps {
  items: SidebarItem[]
  mode: WorkspaceMode
  onModeChange: (mode: WorkspaceMode) => void
  /** Phone/tablet drawer. */
  isOpen: boolean
  onClose: () => void
  /** Desktop only: icons without labels, to leave more room for the screen. */
  isCollapsed: boolean
  onToggleCollapsed: () => void
}

/** An item is active when its path matches and every query parameter it names matches too. */
function isItemActive(item: SidebarItem, pathname: string, search: string): boolean {
  const [path, query] = item.to.split('?')
  if (path !== pathname) return false
  if (!query) return true
  const current = new URLSearchParams(search)
  return [...new URLSearchParams(query)].every(([key, value]) => current.get(key) === value)
}

/**
 * Asphalt sidebar: the product, the company, the mode and its screens, and the account at the foot. On
 * desktop it can collapse to an icon rail; on phones it is a drawer.
 */
export function Sidebar({ items, mode, onModeChange, isOpen, onClose, isCollapsed, onToggleCollapsed }: SidebarProps) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { pathname, search } = useLocation()
  const visibleItems = items.filter(
    (item) => !item.allowedRoles || (user !== null && item.allowedRoles.includes(user.role)),
  )
  // Collapsing only applies from lg up; the phone drawer always shows the labels.
  const hiddenWhenCollapsed = isCollapsed && 'lg:hidden'
  const collapseLabel = isCollapsed ? t('nav.expandMenu') : t('nav.collapseMenu')
  const CollapseIcon = isCollapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <aside
      className={cn(
        'theme-light z-40 flex-col bg-ink text-slate-300',
        'fixed inset-0 lg:sticky lg:top-0 lg:flex lg:h-screen lg:shrink-0 lg:overflow-hidden lg:transition-[width] lg:duration-200',
        isCollapsed ? 'lg:w-[72px]' : 'lg:w-[248px]',
        isOpen ? 'flex' : 'hidden',
      )}
    >
      <div className={cn('flex h-16 items-center gap-2.5 px-5', isCollapsed && 'lg:justify-center lg:px-0')}>
        <Link to={PATHS.home} onClick={onClose} className="flex items-center gap-2.5" aria-label={t('nav.homeLink')}>
          <BrandMark className="size-7 shrink-0 text-brand" />
          <span className={cn('text-base font-bold tracking-tight text-white', hiddenWhenCollapsed)}>RentEquip</span>
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

      {user && (
        <div className={cn('px-5 pt-2 pb-4', hiddenWhenCollapsed)}>
          <p className="truncate text-sm font-semibold text-white" title={user.companyName}>
            {user.companyName}
          </p>
          <p className="text-xs text-slate-400">{t(`roles.${user.role}`)}</p>
        </div>
      )}

      <ModeSwitch mode={mode} onChange={onModeChange} tone="dark" className="mx-4 mb-2 lg:hidden" />
      <CatalogSearch id="menu-search" className="mx-4 mb-4 sm:hidden" />

      <p className={cn('px-5 pt-3 pb-2 text-xs font-medium text-slate-400', hiddenWhenCollapsed)}>
        {t('modes.current', { mode: t(`modes.${mode}.title`).toLowerCase() })}
      </p>
      <nav aria-label={t('nav.main')} className={cn('flex flex-col gap-0.5 px-3', isCollapsed && 'lg:pt-3')}>
        {visibleItems.map((item) => {
          const isActive = isItemActive(item, pathname, search)
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              aria-current={isActive ? 'page' : undefined}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                'relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-200',
                isCollapsed && 'lg:justify-center lg:px-0',
                isActive ? 'bg-ink-hover text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
              )}
            >
              {isActive && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand" aria-hidden="true" />}
              <Icon className={cn('size-[18px] shrink-0', isActive && 'text-brand')} strokeWidth={1.75} aria-hidden="true" />
              <span className={cn('truncate', isCollapsed && 'lg:sr-only')}>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapseLabel}
        aria-expanded={!isCollapsed}
        title={collapseLabel}
        className={cn(
          'mx-3 mt-auto mb-2 hidden h-9 items-center gap-3 rounded-md px-3 text-sm text-slate-400 transition-colors duration-200 hover:bg-white/5 hover:text-white lg:flex',
          isCollapsed && 'lg:justify-center lg:px-0',
        )}
      >
        <CollapseIcon className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
        <span className={cn('truncate', hiddenWhenCollapsed)}>{collapseLabel}</span>
      </button>

      {user && (
        <div
          className={cn(
            'mt-auto flex items-center gap-2 border-t border-white/10 px-5 py-4 lg:mt-0',
            isCollapsed && 'lg:justify-center lg:px-0',
          )}
        >
          <p className={cn('min-w-0 flex-1 truncate text-xs text-slate-400', hiddenWhenCollapsed)} title={user.email}>
            {user.email}
          </p>
          <button
            type="button"
            onClick={logout}
            title={isCollapsed ? t('nav.logout') : undefined}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" strokeWidth={1.75} aria-hidden="true" />
            <span className={cn(isCollapsed && 'lg:sr-only')}>{t('nav.logoutShort')}</span>
          </button>
        </div>
      )}
    </aside>
  )
}
