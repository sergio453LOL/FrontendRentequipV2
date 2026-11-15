import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CheckCheck,
  Flag,
  HandCoins,
  Handshake,
  MessageSquareReply,
  Trash2,
  Truck,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useRefreshSignal } from '../../hooks/useRefreshSignal'
import { useToast } from '../../hooks/useToast'
import { notificationService } from '../../services/notificationService'
import type { AppNotification, NotificationType } from '../../types'
import { ApiError } from '../../utils/apiError'
import { cn } from '../../utils/cn'
import { timeAgo } from '../../utils/timeAgo'

/** The badge follows new alerts without a reload; a minute is quick enough for bookings and offers. */
const POLL_MS = 60_000
const PAGE_SIZE = 15

const ICONS: Record<NotificationType, LucideIcon> = {
  RESERVATION_REQUESTED: CalendarClock,
  RESERVATION_CONFIRMED: CalendarCheck,
  RESERVATION_REJECTED: CalendarX,
  RESERVATION_CANCELLED: CalendarX,
  RESERVATION_STARTED: Truck,
  RESERVATION_COMPLETED: Flag,
  OFFER_RECEIVED: HandCoins,
  OFFER_ACCEPTED: Handshake,
  OFFER_REJECTED: X,
  OFFER_COUNTERED: MessageSquareReply,
}

/**
 * Bell in the top bar: the number of unread alerts on it, and a panel with the latest ones, "mark all as
 * read" and "delete all". Opening an alert marks it read and goes to its screen.
 */
export function NotificationBell() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const refreshSignal = useRefreshSignal()
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<AppNotification[] | null>(null)
  const [busy, setBusy] = useState<'read' | 'delete' | null>(null)

  const loadCount = useCallback(async () => {
    try {
      setUnread(await notificationService.unreadCount())
    } catch {
      // The badge is a hint: a failed poll keeps the last number.
    }
  }, [])

  const loadList = useCallback(async () => {
    try {
      const page = await notificationService.list(PAGE_SIZE)
      setItems(page.content)
    } catch (error) {
      setItems([])
      toast.error(t('notifications.loadFailed'), ApiError.from(error).message)
    }
  }, [t, toast])

  useEffect(() => {
    void loadCount()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadCount()
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [loadCount, refreshSignal])

  useEffect(() => {
    if (!isOpen) return
    void loadList()
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
  }, [isOpen, loadList])

  async function open(item: AppNotification) {
    setIsOpen(false)
    if (!item.read) {
      setUnread((count) => Math.max(0, count - 1))
      void notificationService.markRead(item.id).catch(() => undefined)
    }
    if (item.link) navigate(item.link)
  }

  async function markAllRead() {
    setBusy('read')
    try {
      await notificationService.markAllRead()
      setUnread(0)
      setItems((current) => current?.map((item) => ({ ...item, read: true })) ?? null)
    } catch (error) {
      toast.error(t('notifications.actionFailed'), ApiError.from(error).message)
    } finally {
      setBusy(null)
    }
  }

  async function deleteAll() {
    setBusy('delete')
    try {
      await notificationService.deleteAll()
      setUnread(0)
      setItems([])
    } catch (error) {
      toast.error(t('notifications.actionFailed'), ApiError.from(error).message)
    } finally {
      setBusy(null)
    }
  }

  const badge = unread > 99 ? '99+' : String(unread)
  const hasItems = (items?.length ?? 0) > 0

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={unread > 0 ? t('notifications.openWithCount', { count: unread }) : t('notifications.open')}
        title={t('notifications.title')}
        className={cn(
          'relative flex size-10 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink',
          isOpen && 'bg-slate-100 text-ink',
        )}
      >
        <Bell className={cn('size-5', unread > 0 && 'origin-top motion-safe:animate-[bell-ring_1.2s_ease-in-out_1]')} aria-hidden="true" />
        {unread > 0 && (
          <span className="num absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-action px-1 text-[11px] leading-none font-bold text-white ring-2 ring-white">
            {badge}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t('notifications.title')}
          className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-1.5rem))] animate-[fade-in_120ms_ease-out] overflow-hidden rounded-xl bg-white shadow-[0_16px_40px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/10"
        >
          <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
            <p className="text-sm font-bold text-ink">
              {t('notifications.title')}
              {unread > 0 && <span className="num ml-1.5 font-semibold text-action-ink">{t('notifications.unread', { count: unread })}</span>}
            </p>
          </div>
          <div className="flex gap-2 px-4 pb-3">
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={busy !== null || unread === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-100 px-2.5 text-xs font-semibold text-ink transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCheck className="size-4" aria-hidden="true" />
              {t('notifications.markAllRead')}
            </button>
            <button
              type="button"
              onClick={() => void deleteAll()}
              disabled={busy !== null || !hasItems}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-negative transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {t('notifications.deleteAll')}
            </button>
          </div>

          <div className="max-h-[min(28rem,70vh)] overflow-y-auto bg-slate-50/60">
            {items === null ? (
              <p className="px-4 py-6 text-sm text-slate-600">{t('common.loading')}</p>
            ) : !hasItems ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <Bell className="size-8 text-slate-300" aria-hidden="true" />
                <p className="text-sm font-semibold text-ink">{t('notifications.emptyTitle')}</p>
                <p className="text-sm text-slate-600">{t('notifications.emptyText')}</p>
              </div>
            ) : (
              <ul>
                {items.map((item) => {
                  const Icon = ICONS[item.type] ?? Bell
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => void open(item)}
                        className={cn(
                          'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-white',
                          !item.read && 'bg-amber-50/70',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                            item.read ? 'bg-slate-100 text-slate-500' : 'bg-machine text-asphalt',
                          )}
                          aria-hidden="true"
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn('block text-sm leading-5 text-ink', !item.read && 'font-semibold')}>{item.title}</span>
                          <span className="mt-0.5 block text-[13px] leading-5 text-slate-600">{item.message}</span>
                          <span className="mt-1 block text-xs text-slate-500">{timeAgo(item.createdAt)}</span>
                        </span>
                        {!item.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-action" aria-label={t('notifications.new')} />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
