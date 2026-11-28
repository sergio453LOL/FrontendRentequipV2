import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { AppButton } from '../../components/AppButton'
import { Badge } from '../../components/Badge'
import { EmptyState, ErrorView, LoadingView } from '../../components/StateViews'
import { useAction } from '../../hooks/useAction'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { useTheme } from '../../hooks/useTheme'
import type { RootScreenProps } from '../../navigation/types'
import { purchaseService } from '../../services/rentequipApi'
import { radius, spacing } from '../../theme'
import { makeStyles } from '../../theme/makeStyles'
import type { PurchaseRequest, PurchaseStatus, ReservationRole } from '../../types/api'
import { formatCurrency } from '../../utils/format'

const STATUS_TONE: Record<PurchaseStatus, 'green' | 'amber' | 'blue' | 'gray' | 'red'> = {
  PENDING: 'amber',
  ACCEPTED: 'blue',
  REJECTED: 'red',
  CANCELLED: 'gray',
  PAID: 'green',
}

/**
 * Purchase requests, as the buyer (renter) or as the seller (owner). The seller accepts or rejects; once
 * accepted the buyer pays with a card, or withdraws while it is still open.
 */
export default function PurchasesScreen({ route, navigation }: RootScreenProps<'Purchases'>) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const [role, setRole] = useState<ReservationRole>(route.params?.role ?? 'RENTER')

  const fetchPage = useCallback((page: number, signal: AbortSignal) => purchaseService.list(role, page, signal), [role])
  const list = usePaginatedList(fetchPage)

  const isFirstFocus = useRef(true)
  const { refresh } = list
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false
        return
      }
      refresh()
    }, [refresh]),
  )

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <View style={styles.segmented} accessibilityRole="tablist">
          {(['RENTER', 'OWNER'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setRole(option)}
              accessibilityRole="tab"
              accessibilityState={{ selected: role === option }}
              style={[styles.segment, role === option && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, role === option && styles.segmentTextActive]}>{t(`purchases.roles.${option}`)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <FlatList
        data={list.items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <PurchaseItem
            purchase={item}
            role={role}
            onChanged={list.refresh}
            onPay={(purchase) =>
              navigation.navigate('Payment', {
                reservationId: purchase.reservationId,
                purchase: {
                  id: purchase.id,
                  equipmentName: purchase.equipmentName,
                  finalPrice: purchase.finalPrice,
                  currency: purchase.currency,
                },
              })
            }
            onOpenReservation={(purchase) => navigation.navigate('ReservationDetail', { reservationId: purchase.reservationId })}
          />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={list.isRefreshing} onRefresh={list.refresh} tintColor={colors.brand} />}
        ListEmptyComponent={
          list.isLoading ? (
            <LoadingView label={t('purchases.loading')} />
          ) : list.error ? (
            <ErrorView error={list.error} onRetry={list.retry} />
          ) : (
            <EmptyState
              icon="cart-outline"
              title={t('purchases.empty')}
              description={role === 'RENTER' ? t('purchases.emptyBuyerHint') : t('purchases.emptySellerHint')}
            />
          )
        }
        ListFooterComponent={list.isLoadingMore ? <ActivityIndicator style={{ margin: spacing.lg }} color={colors.brand} /> : undefined}
      />
    </View>
  )
}

function PurchaseItem({
  purchase,
  role,
  onChanged,
  onPay,
  onOpenReservation,
}: {
  purchase: PurchaseRequest
  role: ReservationRole
  onChanged: () => void
  onPay: (purchase: PurchaseRequest) => void
  onOpenReservation: (purchase: PurchaseRequest) => void
}) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { run, isRunning } = useAction()
  const money = (amount: number) => formatCurrency(amount, purchase.currency)
  const counterpart = role === 'RENTER' ? purchase.sellerCompanyName : purchase.buyerCompanyName
  const act = (action: () => Promise<unknown>, successMessage: string) =>
    void run(action, { successMessage, errorTitle: t('purchases.actionFailed'), onSuccess: onChanged })

  const isBuyer = role === 'RENTER'
  const isOpen = purchase.status === 'PENDING' || purchase.status === 'ACCEPTED'

  return (
    <View style={styles.card}>
      <Pressable onPress={() => onOpenReservation(purchase)} accessibilityRole="link" style={styles.head}>
        <Text style={styles.name} numberOfLines={2}>
          {purchase.equipmentName}
        </Text>
        <Badge label={t(`purchases.status.${purchase.status}`)} tone={STATUS_TONE[purchase.status]} />
      </Pressable>
      <Text style={styles.muted}>{counterpart}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>{t('purchases.listPrice')}</Text>
        <Text style={styles.value}>{money(purchase.listPrice)}</Text>
      </View>
      {purchase.rentCredit > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>{t('purchases.rentCreditShort')}</Text>
          <Text style={styles.value}>− {money(purchase.rentCredit)}</Text>
        </View>
      )}
      <View style={styles.row}>
        <Text style={[styles.label, styles.bold]}>{t('purchases.finalPrice')}</Text>
        <Text style={[styles.value, styles.bold]}>{money(purchase.finalPrice)}</Text>
      </View>

      {!isBuyer && purchase.status === 'PENDING' && (
        <View style={styles.actions}>
          <AppButton
            title={t('purchases.accept')}
            icon="checkmark"
            style={styles.action}
            isLoading={isRunning}
            onPress={() => act(() => purchaseService.accept(purchase.id), t('purchases.accepted'))}
          />
          <AppButton
            title={t('purchases.reject')}
            variant="danger"
            style={styles.action}
            disabled={isRunning}
            onPress={() => act(() => purchaseService.reject(purchase.id), t('purchases.rejected'))}
          />
        </View>
      )}
      {!isBuyer && purchase.status === 'ACCEPTED' && <Text style={styles.muted}>{t('purchases.waitingPayment')}</Text>}
      {isBuyer && purchase.status === 'PENDING' && <Text style={styles.muted}>{t('purchases.waitingSeller')}</Text>}
      {isBuyer && purchase.status === 'ACCEPTED' && (
        <AppButton title={t('purchases.pay', { amount: money(purchase.finalPrice) })} icon="card-outline" onPress={() => onPay(purchase)} />
      )}
      {isBuyer && isOpen && (
        <AppButton
          title={t('purchases.cancel')}
          variant="ghost"
          disabled={isRunning}
          onPress={() => act(() => purchaseService.cancel(purchase.id), t('purchases.cancelled'))}
        />
      )}
    </View>
  )
}

const useStyles = makeStyles((colors, typography) => ({
  container: { flex: 1, backgroundColor: colors.background },
  filters: { padding: spacing.lg, paddingBottom: spacing.sm },
  segmented: { flexDirection: 'row', backgroundColor: colors.raised, borderRadius: radius.md, padding: 4 },
  segment: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  segmentTextActive: { color: colors.ink },
  list: { padding: spacing.lg, paddingTop: spacing.sm, flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  name: { ...typography.heading, flex: 1, fontSize: 16 },
  muted: { fontSize: 13, color: colors.muted },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  label: { flex: 1, fontSize: 14, color: colors.muted },
  value: { fontSize: 14, fontWeight: '600', color: colors.ink },
  bold: { fontWeight: '800', color: colors.ink, fontSize: 15 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1 },
}))
