import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader2, Mail, MessageCircle, MessageSquareText, RotateCw, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { reservationService } from '../../services/reservationService'
import type { ReceiptChannel } from '../../types'
import { ApiError } from '../../utils/apiError'
import { cn } from '../../utils/cn'

type Delivery =
  | { state: 'sending' }
  | { state: 'sent'; destination: string }
  | { state: 'failed'; reason: string }

const CHANNELS: { channel: ReceiptChannel; icon: LucideIcon }[] = [
  { channel: 'EMAIL', icon: Mail },
  { channel: 'WHATSAPP', icon: MessageCircle },
  { channel: 'SMS', icon: MessageSquareText },
]

/**
 * Reservations whose receipt already went out from this tab, and what happened on each channel. React mounts
 * components twice in development and the screen can be opened again, so both live outside the component:
 * the automatic send happens once and a reopened screen shows the real outcome.
 */
const autoSent = new Set<number>()
const lastDeliveries = new Map<number, Partial<Record<ReceiptChannel, Delivery>>>()

/** s***@gmail.com, the same mask the backend uses for the addresses it reports. */
function maskEmail(email: string) {
  const [name, domain] = email.split('@')
  return domain ? `${name.charAt(0)}***@${domain}` : email
}

/**
 * The receipt on the three channels right after paying. The backend already emails it on its own, so the
 * mail row starts as sent; WhatsApp and SMS go out from here, each with what happened, and every row has its
 * own button to send that channel again.
 */
export function ReceiptDeliveryStatus({ reservationId }: { reservationId: number }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [deliveries, setDeliveries] = useState<Record<ReceiptChannel, Delivery>>(() => ({
    EMAIL: user ? { state: 'sent', destination: maskEmail(user.email) } : { state: 'sending' },
    WHATSAPP: { state: 'sending' },
    SMS: { state: 'sending' },
    ...lastDeliveries.get(reservationId),
  }))

  const update = useCallback(
    (channel: ReceiptChannel, delivery: Delivery) => {
      lastDeliveries.set(reservationId, { ...lastDeliveries.get(reservationId), [channel]: delivery })
      setDeliveries((current) => ({ ...current, [channel]: delivery }))
    },
    [reservationId],
  )

  const send = useCallback(
    async (channel: ReceiptChannel) => {
      update(channel, { state: 'sending' })
      try {
        const delivery = await reservationService.sendReceipt(reservationId, channel)
        update(channel, { state: 'sent', destination: delivery.destination })
      } catch (error) {
        update(channel, { state: 'failed', reason: ApiError.from(error).message })
      }
    },
    [reservationId, update],
  )

  useEffect(() => {
    if (autoSent.has(reservationId)) return
    autoSent.add(reservationId)
    void send('WHATSAPP')
    void send('SMS')
  }, [reservationId, send])

  const isSending = Object.values(deliveries).some((delivery) => delivery.state === 'sending')
  const failedCount = Object.values(deliveries).filter((delivery) => delivery.state === 'failed').length

  return (
    <section aria-labelledby="receipt-delivery-title" className="w-full rounded-xl border border-slate-200/80 bg-slate-50 text-left">
      <div className="border-b border-slate-200/80 px-4 py-3">
        <h4 id="receipt-delivery-title" className="text-sm font-semibold text-slate-900">
          {isSending ? t('receipt.delivery.sendingTitle') : failedCount > 0 ? t('receipt.delivery.partialTitle') : t('receipt.delivery.doneTitle')}
        </h4>
        <p className="mt-0.5 text-[13px] leading-5 text-slate-600">{t('receipt.delivery.hint')}</p>
      </div>
      <ul className="divide-y divide-slate-200/80" aria-live="polite">
        {CHANNELS.map(({ channel, icon: Icon }) => {
          const delivery = deliveries[channel]
          return (
            <li key={channel} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200/80">
                <Icon className="size-4 text-slate-600" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{t(`receipt.channelNames.${channel}`)}</p>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={delivery.state}
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.15 }}
                    title={delivery.state === 'failed' ? delivery.reason : undefined}
                    className={cn(
                      'flex items-center gap-1 truncate text-xs',
                      delivery.state === 'sent' && 'text-positive',
                      delivery.state === 'failed' && 'text-red-700',
                      delivery.state === 'sending' && 'text-slate-500',
                    )}
                  >
                    {delivery.state === 'sending' && <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden="true" />}
                    {delivery.state === 'sent' && <Check className="size-3 shrink-0" aria-hidden="true" />}
                    {delivery.state === 'failed' && <TriangleAlert className="size-3 shrink-0" aria-hidden="true" />}
                    <span className="truncate">
                      {delivery.state === 'sending'
                        ? t('receipt.delivery.sending')
                        : delivery.state === 'sent'
                          ? t('receipt.delivery.sentTo', { destination: delivery.destination })
                          : t('receipt.delivery.failed', { reason: delivery.reason })}
                    </span>
                  </motion.p>
                </AnimatePresence>
              </div>
              <button
                type="button"
                onClick={() => void send(channel)}
                disabled={delivery.state === 'sending'}
                aria-label={t('receipt.delivery.resendChannel', { channel: t(`receipt.channelNames.${channel}`) })}
                className={cn(
                  'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50',
                  delivery.state === 'failed'
                    ? 'bg-ink text-sheet hover:bg-ink-hover'
                    : 'bg-white text-slate-700 ring-1 ring-slate-200/80 hover:text-slate-900',
                )}
              >
                <RotateCw className="size-3.5" aria-hidden="true" />
                {delivery.state === 'failed' ? t('receipt.delivery.retry') : t('receipt.delivery.resend')}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
