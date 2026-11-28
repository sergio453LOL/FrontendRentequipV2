import { useNavigation } from '@react-navigation/native'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'
import { useAction } from '../hooks/useAction'
import { useAsync } from '../hooks/useAsync'
import type { RootNavigation } from '../navigation/types'
import { purchaseService } from '../services/rentequipApi'
import { radius, spacing } from '../theme'
import { makeStyles } from '../theme/makeStyles'
import { formatCurrency } from '../utils/format'
import { AppButton } from './AppButton'

/**
 * On the renter's reservation of a machine that is also for sale: what buying it costs now (list price
 * minus the share of the rent already paid) and the button to ask the owner for it. Hidden when the
 * machine is not for sale.
 */
export function PurchaseCard({ reservationId }: { reservationId: number }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const navigation = useNavigation<RootNavigation>()
  const fetchQuote = useCallback((signal: AbortSignal) => purchaseService.quote(reservationId, signal), [reservationId])
  const quote = useAsync(fetchQuote)
  const { run, isRunning } = useAction()

  const data = quote.data
  if (!data || data.reason === 'NOT_FOR_SALE' || data.listPrice === null) return null
  const money = (amount: number) => formatCurrency(amount, data.currency)
  const openPurchases = () => navigation.navigate('Purchases', { role: 'RENTER' })

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('purchases.cardTitle')}</Text>
      <Row label={t('purchases.listPrice')} value={money(data.listPrice)} />
      {data.rentCredit > 0 && (
        <Row label={t('purchases.rentCredit', { percent: data.rentCreditPercent })} value={`− ${money(data.rentCredit)}`} />
      )}
      {data.finalPrice !== null && <Row label={t('purchases.finalPrice')} value={money(data.finalPrice)} bold />}

      {data.openRequestId !== null ? (
        <>
          <Text style={styles.muted}>{t('purchases.alreadyRequested')}</Text>
          <AppButton title={t('purchases.seeRequests')} icon="receipt-outline" variant="secondary" onPress={openPurchases} />
        </>
      ) : data.eligible ? (
        <>
          <Text style={styles.muted}>{t('purchases.requestHint')}</Text>
          <AppButton
            title={t('purchases.request')}
            icon="cart-outline"
            isLoading={isRunning}
            onPress={() =>
              void run(() => purchaseService.request(reservationId), {
                successMessage: t('purchases.requested'),
                errorTitle: t('purchases.actionFailed'),
                onSuccess: () => {
                  quote.reload()
                  openPurchases()
                },
              })
            }
          />
        </>
      ) : (
        <Text style={styles.muted}>{t(`purchases.ineligible.${data.reason ?? 'RESERVATION_STATUS'}`)}</Text>
      )}
    </View>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const styles = useStyles()
  return (
    <View style={styles.row}>
      <Text style={[styles.label, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.value, bold && styles.bold]}>{value}</Text>
    </View>
  )
}

const useStyles = makeStyles((colors, typography) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: typography.heading,
  muted: { fontSize: 13, color: colors.muted },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  label: { flex: 1, fontSize: 14, color: colors.muted },
  value: { fontSize: 14, fontWeight: '600', color: colors.ink },
  bold: { fontWeight: '800', color: colors.ink, fontSize: 15 },
}))
