import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { useAction } from '../hooks/useAction'
import { useToast } from '../hooks/useToast'
import { reservationService } from '../services/rentequipApi'
import { spacing } from '../theme'
import type { ReceiptChannel } from '../types/api'
import { AppButton } from './AppButton'

/** Sends the receipt to the user's registered email or WhatsApp; the toast says exactly where it went. */
export function ReceiptShareButtons({ reservationId }: { reservationId: number }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { run, isRunning } = useAction()
  const [sendingChannel, setSendingChannel] = useState<ReceiptChannel | null>(null)

  async function send(channel: ReceiptChannel) {
    setSendingChannel(channel)
    await run(() => reservationService.sendReceipt(reservationId, channel), {
      errorTitle: t('receipt.sendFailed'),
      // The masked destination only comes in the response, so the toast is built here.
      onSuccess: (delivery) =>
        toast.success(
          t('receipt.sent'),
          t('receipt.sentTo', { channel: t(`receipt.channels.${delivery.channel}`), destination: delivery.destination }),
        ),
    })
    setSendingChannel(null)
  }

  return (
    <View style={styles.row}>
      <AppButton
        title={t('receipt.byEmail')}
        icon="mail-outline"
        variant="secondary"
        style={styles.flex}
        isLoading={isRunning && sendingChannel === 'EMAIL'}
        disabled={isRunning}
        onPress={() => void send('EMAIL')}
      />
      <AppButton
        title={t('receipt.byWhatsApp')}
        icon="logo-whatsapp"
        variant="secondary"
        style={styles.flex}
        isLoading={isRunning && sendingChannel === 'WHATSAPP'}
        disabled={isRunning}
        onPress={() => void send('WHATSAPP')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
})
