import { Mail, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '../../hooks/useMutation'
import { reservationService } from '../../services/reservationService'
import type { ReceiptChannel } from '../../types'
import { Button } from '../common/Button'

interface ReceiptShareButtonsProps {
  reservationId: number
  size?: 'sm' | 'md'
}

/** Sends the receipt to the user's registered email or WhatsApp; the toast says exactly where it went. */
export function ReceiptShareButtons({ reservationId, size = 'md' }: ReceiptShareButtonsProps) {
  const { t } = useTranslation()
  const [sendingChannel, setSendingChannel] = useState<ReceiptChannel | null>(null)
  const send = useMutation((channel: ReceiptChannel) => reservationService.sendReceipt(reservationId, channel), {
    successMessage: (delivery) =>
      t('receipt.sent', { channel: t(`receipt.channels.${delivery.channel}`), destination: delivery.destination }),
    errorTitle: t('receipt.sendFailed'),
  })

  return (
    <>
      <Button
        size={size}
        variant="secondary"
        disabled={send.isLoading}
        isLoading={send.isLoading && sendingChannel === 'EMAIL'}
        onClick={() => {
          setSendingChannel('EMAIL')
          void send.mutate('EMAIL')
        }}
        leftIcon={<Mail className="size-4" />}
      >
        {t('receipt.sendEmail')}
      </Button>
      <Button
        size={size}
        variant="secondary"
        disabled={send.isLoading}
        isLoading={send.isLoading && sendingChannel === 'WHATSAPP'}
        onClick={() => {
          setSendingChannel('WHATSAPP')
          void send.mutate('WHATSAPP')
        }}
        leftIcon={<MessageCircle className="size-4" />}
      >
        {t('receipt.sendWhatsApp')}
      </Button>
    </>
  )
}
