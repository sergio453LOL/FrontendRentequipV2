import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { AppButton } from '../../components/AppButton'
import { Badge } from '../../components/Badge'
import { EmptyState, ErrorView, LoadingView } from '../../components/StateViews'
import { TextField } from '../../components/TextField'
import { useAction } from '../../hooks/useAction'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { useTheme } from '../../hooks/useTheme'
import type { RootScreenProps } from '../../navigation/types'
import { offerService } from '../../services/rentequipApi'
import { radius, spacing } from '../../theme'
import { makeStyles } from '../../theme/makeStyles'
import type { OfferStatus, PriceOffer, ReservationRole } from '../../types/api'
import { formatCurrency, formatDate } from '../../utils/format'

const STATUS_TONE: Record<OfferStatus, 'green' | 'amber' | 'blue' | 'gray' | 'red'> = {
  PENDING: 'amber',
  COUNTERED: 'blue',
  ACCEPTED: 'green',
  REJECTED: 'red',
  CANCELLED: 'gray',
  USED: 'gray',
}

/**
 * Price negotiations, as the renter who proposed them or as the owner who answers them. The owner
 * accepts, rejects or counters; the renter accepts a counter, cancels, or books at the agreed rate.
 */
export default function OffersScreen({ route, navigation }: RootScreenProps<'Offers'>) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const [role, setRole] = useState<ReservationRole>(route.params?.role ?? 'RENTER')

  const fetchPage = useCallback((page: number, signal: AbortSignal) => offerService.list(role, page, signal), [role])
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
              <Text style={[styles.segmentText, role === option && styles.segmentTextActive]}>{t(`offers.roles.${option}`)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <FlatList
        data={list.items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <OfferCard
            offer={item}
            role={role}
            onChanged={list.refresh}
            onBook={(offer) =>
              navigation.navigate('EquipmentDetail', {
                equipmentId: offer.equipmentId,
                name: offer.equipmentName,
                offerId: offer.id,
                agreedDailyRate: offer.agreedDailyRate ?? offer.proposedDailyRate,
              })
            }
            onOpenEquipment={(offer) => navigation.navigate('EquipmentDetail', { equipmentId: offer.equipmentId, name: offer.equipmentName })}
          />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={list.isRefreshing} onRefresh={list.refresh} tintColor={colors.brand} />}
        ListEmptyComponent={
          list.isLoading ? (
            <LoadingView label={t('offers.loading')} />
          ) : list.error ? (
            <ErrorView error={list.error} onRetry={list.retry} />
          ) : (
            <EmptyState
              icon="pricetags-outline"
              title={t('offers.empty')}
              description={role === 'RENTER' ? t('offers.emptyRenterHint') : t('offers.emptyOwnerHint')}
            />
          )
        }
        ListFooterComponent={list.isLoadingMore ? <ActivityIndicator style={{ margin: spacing.lg }} color={colors.brand} /> : undefined}
      />
    </View>
  )
}

function OfferCard({
  offer,
  role,
  onChanged,
  onBook,
  onOpenEquipment,
}: {
  offer: PriceOffer
  role: ReservationRole
  onChanged: () => void
  onBook: (offer: PriceOffer) => void
  onOpenEquipment: (offer: PriceOffer) => void
}) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { run, isRunning } = useAction()
  const [isCountering, setIsCountering] = useState(false)
  const [counterRate, setCounterRate] = useState('')
  const money = (amount: number) => formatCurrency(amount, offer.currency)
  const counterpart = role === 'RENTER' ? offer.ownerCompanyName : offer.renterCompanyName

  const act = (action: () => Promise<unknown>, successMessage: string) =>
    void run(action, { successMessage, errorTitle: t('offers.actionFailed'), onSuccess: onChanged })

  const counterValue = Number(counterRate.replace(',', '.'))
  const canOwnerAnswer = role === 'OWNER' && offer.status === 'PENDING'
  const canRenterAnswer = role === 'RENTER' && offer.status === 'COUNTERED'
  const canCancel = role === 'RENTER' && (offer.status === 'PENDING' || offer.status === 'COUNTERED')
  const canBook = role === 'RENTER' && offer.status === 'ACCEPTED'

  return (
    <View style={styles.card}>
      <Pressable onPress={() => onOpenEquipment(offer)} accessibilityRole="link" style={styles.head}>
        <Text style={styles.name} numberOfLines={2}>
          {offer.equipmentName}
        </Text>
        <Badge label={t(`offers.status.${offer.status}`)} tone={STATUS_TONE[offer.status]} />
      </Pressable>
      <Text style={styles.muted}>{counterpart}</Text>

      <View style={styles.rates}>
        <Rate label={t('offers.listRate')} value={money(offer.listDailyRate)} />
        <Rate label={t('offers.proposed')} value={money(offer.proposedDailyRate)} />
        {offer.counterDailyRate !== null && <Rate label={t('offers.counter')} value={money(offer.counterDailyRate)} />}
        {offer.agreedDailyRate !== null && <Rate label={t('offers.agreed')} value={money(offer.agreedDailyRate)} strong />}
      </View>
      {offer.startDate && offer.endDate && (
        <Text style={styles.muted}>
          {formatDate(offer.startDate)} – {formatDate(offer.endDate)}
        </Text>
      )}
      {offer.renterMessage && <Text style={styles.message}>“{offer.renterMessage}”</Text>}
      {offer.ownerMessage && <Text style={styles.message}>“{offer.ownerMessage}”</Text>}

      {canOwnerAnswer &&
        (isCountering ? (
          <>
            <TextField
              label={t('offers.counterRate')}
              value={counterRate}
              onChangeText={(text) => setCounterRate(text.replace(/[^\d.,]/g, ''))}
              keyboardType="decimal-pad"
            />
            <AppButton
              title={t('offers.sendCounter')}
              icon="swap-horizontal"
              isLoading={isRunning}
              disabled={!(counterValue > 0)}
              onPress={() => act(() => offerService.counter(offer.id, { dailyRate: counterValue }), t('offers.countered'))}
            />
            <AppButton title={t('common.cancel')} variant="ghost" onPress={() => setIsCountering(false)} />
          </>
        ) : (
          <View style={styles.actions}>
            <AppButton
              title={t('offers.accept')}
              icon="checkmark"
              style={styles.action}
              isLoading={isRunning}
              onPress={() => act(() => offerService.accept(offer.id), t('offers.accepted'))}
            />
            <AppButton title={t('offers.counterAction')} variant="secondary" style={styles.action} onPress={() => setIsCountering(true)} />
            <AppButton
              title={t('offers.reject')}
              variant="danger"
              style={styles.action}
              disabled={isRunning}
              onPress={() => act(() => offerService.reject(offer.id), t('offers.rejected'))}
            />
          </View>
        ))}

      {canRenterAnswer && (
        <AppButton
          title={t('offers.acceptCounter', { rate: money(offer.counterDailyRate ?? offer.proposedDailyRate) })}
          icon="checkmark"
          isLoading={isRunning}
          onPress={() => act(() => offerService.accept(offer.id), t('offers.accepted'))}
        />
      )}
      {canBook && <AppButton title={t('offers.book')} icon="calendar" onPress={() => onBook(offer)} />}
      {canCancel && (
        <AppButton
          title={t('offers.cancel')}
          variant="ghost"
          disabled={isRunning}
          onPress={() => act(() => offerService.cancel(offer.id), t('offers.cancelled'))}
        />
      )}
    </View>
  )
}

function Rate({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const styles = useStyles()
  return (
    <View style={styles.rate}>
      <Text style={styles.rateLabel}>{label}</Text>
      <Text style={[styles.rateValue, strong && styles.rateStrong]}>{value}</Text>
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
  message: { ...typography.body, fontStyle: 'italic' },
  rates: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  rate: { minWidth: '40%', gap: 2 },
  rateLabel: { fontSize: 12, color: colors.muted },
  rateValue: { fontSize: 15, fontWeight: '600', color: colors.ink },
  rateStrong: { fontWeight: '800', color: colors.success },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1 },
}))
