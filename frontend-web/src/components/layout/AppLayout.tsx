import { AnimatePresence, motion } from 'framer-motion'
import { CalendarRange, ClipboardList, HandCoins, Handshake, LayoutDashboard, MessagesSquare, PlusCircle, Search, ShoppingBag, Sparkles, Tags, Truck } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useSidebarCollapsed } from '../../hooks/useSidebarCollapsed'
import { PATHS } from '../../routes/paths'
import { ADMIN_ROLES, PUBLISHER_ROLES } from '../../routes/roles'
import { ASSISTANT_PARAM } from '../../utils/assistantLink'
import { MODE_HOME, modeForLocation, readStoredMode, storeMode, type WorkspaceMode } from '../../utils/workspaceMode'
import { ErrorBoundary } from '../common/ErrorBoundary'
import { OfflineBanner } from '../common/OfflineBanner'
import { ScrollToTopButton } from '../common/ScrollToTopButton'
import { Sidebar, type SidebarItem } from '../common/Sidebar'
import { FullPageSpinner } from '../common/Spinner'
import { TopBar } from '../common/TopBar'

/** The assistant's code loads the first time someone opens it, not with every screen. */
const AIChatWidget = lazy(() => import('../common/AIChatWidget').then((module) => ({ default: module.AIChatWidget })))

/** Screens of each mode; `label` is an i18n key under `nav`. */
const NAVIGATION: Record<WorkspaceMode, (Omit<SidebarItem, 'label'> & { label: NavKey })[]> = {
  renter: [
    { label: 'catalog', to: PATHS.catalog, icon: Search },
    { label: 'myReservations', to: `${PATHS.reservations}?role=RENTER`, icon: CalendarRange },
    { label: 'myPurchases', to: `${PATHS.purchases}?role=RENTER`, icon: ShoppingBag },
    { label: 'myOffers', to: `${PATHS.offers}?role=RENTER`, icon: MessagesSquare },
  ],
  owner: [
    { label: 'dashboard', to: PATHS.home, icon: LayoutDashboard },
    { label: 'fleet', to: PATHS.fleet, icon: Truck },
    { label: 'ownerReservations', to: `${PATHS.reservations}?role=OWNER`, icon: ClipboardList },
    { label: 'sales', to: `${PATHS.purchases}?role=OWNER`, icon: HandCoins },
    { label: 'receivedOffers', to: `${PATHS.offers}?role=OWNER`, icon: Handshake },
    { label: 'publish', to: PATHS.publishEquipment, icon: PlusCircle, allowedRoles: PUBLISHER_ROLES },
    { label: 'categories', to: PATHS.categories, icon: Tags, allowedRoles: ADMIN_ROLES },
  ],
}

type NavKey =
  | 'catalog'
  | 'myReservations'
  | 'myPurchases'
  | 'myOffers'
  | 'dashboard'
  | 'fleet'
  | 'ownerReservations'
  | 'sales'
  | 'receivedOffers'
  | 'publish'
  | 'categories'

/**
 * Asphalt sidebar, white header and the screen on a light slate ground. The navigation follows the
 * workspace mode: renting machines in (catalogue, my reservations) or renting the fleet out (panel,
 * fleet, requests, publish).
 */
export function AppLayout() {
  const { t } = useTranslation()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSidebarCollapsed, toggleSidebar] = useSidebarCollapsed()
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  // Stays mounted after the first opening so the conversation survives closing the panel.
  const [hasOpenedAssistant, setHasOpenedAssistant] = useState(false)
  if (isAssistantOpen && !hasOpenedAssistant) setHasOpenedAssistant(true)
  const [storedMode, setStoredMode] = useState<WorkspaceMode>(readStoredMode)

  // The screen decides the mode when it belongs to one side; neutral screens keep the last one.
  const routeMode = modeForLocation(pathname, search)
  const mode = routeMode ?? storedMode
  if (routeMode && routeMode !== storedMode) setStoredMode(routeMode)
  useEffect(() => storeMode(mode), [mode])

  const changeMode = useCallback(
    (next: WorkspaceMode) => {
      setStoredMode(next)
      setIsMenuOpen(false)
      navigate(MODE_HOME[next])
    },
    [navigate],
  )
  const openMenu = useCallback(() => setIsMenuOpen(true), [])
  const closeMenu = useCallback(() => setIsMenuOpen(false), [])
  const toggleAssistant = useCallback(() => setIsAssistantOpen((open) => !open), [])
  const closeAssistant = useCallback(() => setIsAssistantOpen(false), [])

  // A question sent from the landing's AI search (`?asistente=...`): open the advisor, ask it once, clean the URL.
  const [searchParams, setSearchParams] = useSearchParams()
  const questionFromUrl = searchParams.get(ASSISTANT_PARAM)
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  if (questionFromUrl && pendingQuestion !== questionFromUrl) {
    setPendingQuestion(questionFromUrl)
    setIsAssistantOpen(true)
  }
  useEffect(() => {
    if (!questionFromUrl) return
    setSearchParams(
      (params) => {
        params.delete(ASSISTANT_PARAM)
        return params
      },
      { replace: true },
    )
  }, [questionFromUrl, setSearchParams])
  const clearPendingQuestion = useCallback(() => setPendingQuestion(null), [])

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <Sidebar
        items={NAVIGATION[mode].map((item) => ({ ...item, label: t(`nav.${item.label}`) }))}
        mode={mode}
        onModeChange={changeMode}
        isOpen={isMenuOpen}
        onClose={closeMenu}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <TopBar
          mode={mode}
          onModeChange={changeMode}
          onOpenMenu={openMenu}
          onToggleAssistant={toggleAssistant}
          isAssistantOpen={isAssistantOpen}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <ErrorBoundary key={pathname} inline>
            <Suspense fallback={<FullPageSpinner />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      {hasOpenedAssistant && (
        <Suspense fallback={null}>
          <AIChatWidget
            isOpen={isAssistantOpen}
            onClose={closeAssistant}
            mode={mode}
            initialQuestion={pendingQuestion}
            onInitialQuestionAsked={clearPendingQuestion}
          />
        </Suspense>
      )}

      {/* While exploring, the assistant also floats at hand. */}
      <AnimatePresence>
        {mode === 'renter' && !isAssistantOpen && (
          <motion.button
            type="button"
            onClick={toggleAssistant}
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 12 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            aria-label={t('nav.openAssistant')}
            className="fixed right-5 bottom-5 z-30 flex h-12 items-center gap-2 rounded-full bg-ink pr-5 pl-4 text-sm font-semibold text-white shadow-[0_10px_30px_-6px_rgba(15,23,42,0.55)] ring-2 ring-brand/70"
          >
            <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-brand/25 [animation-duration:2.6s] motion-reduce:hidden" aria-hidden="true" />
            <Sparkles className="size-5 text-brand" aria-hidden="true" />
            {t('nav.askAi')}
          </motion.button>
        )}
      </AnimatePresence>
      <ScrollToTopButton raised={mode === 'renter' && !isAssistantOpen} />
    </div>
  )
}
