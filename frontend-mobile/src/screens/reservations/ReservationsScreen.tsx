import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { AppButton } from '../../components/AppButton'
import { Chip } from '../../components/Chip'
import { DemoBanner } from '../../components/DemoBanner'
import { ReservationCard } from '../../components/ReservationCard'
import { EmptyState, ErrorView, LoadingView } from '../../components/StateViews'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { useTheme } from '../../hooks/useTheme'
import type { MainTabParamList, RootNavigation } from '../../navigation/types'
import { reservationService } from '../../services/rentequipApi'
import { radius, spacing } from '../../theme'
import { makeStyles } from '../../theme/makeStyles'
import type { ReservationRole, ReservationStatus } from '../../types/api'

const PAGE_SIZE = 10
const STATUS_FILTERS: (ReservationStatus | null)[] = [null, 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

export default function ReservationsScreen() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const navigation = useNavigation<RootNavigation>()
  const route = useRoute<RouteProp<MainTabParamList, 'Reservations'>>()
  // A role passed by another screen (e.g. after booking) wins once; then the user's choice is kept.
  const paramRole = route.params?.role
  const [roleState, setRoleState] = useState<{ role: ReservationRole; fromParam?: ReservationRole }>({
    role: paramRole ?? 'RENTER',
    fromParam: paramRole,
  })
  if (paramRole && paramRole !== roleState.fromParam) setRoleState({ role: paramRole, fromParam: paramRole })
  const role = roleState.role
  const setRole = (next: ReservationRole) => setRoleState((current) => ({ ...current, role: next }))
  const [status, setStatus] = useState<ReservationStatus | null>(null)

  const fetchPage = useCallback(
    (page: number, signal: AbortSignal) =>
      reservationService.list({ role, status: status ?? undefined, page, size: PAGE_SIZE }, signal),
    [role, status],
  )
  const list = usePaginatedList(fetchPage)

  // Coming back from a detail screen (confirmed, cancelled, new photo…) shows the fresh state.
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
      <DemoBanner />
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
              <Text style={[styles.segmentText, role === option && styles.segmentTextActive]}>
                {t(`reservations.roles.${option}`)}
              </Text>
            </Pressable>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {STATUS_FILTERS.map((option) => (
            <Chip
              key={option ?? 'all'}
              label={option ? t(`status.reservation.${option}`) : t('reservations.all')}
              selected={status === option}
              onPress={() => setStatus(option)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={list.items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ReservationCard reservation={item} role={role} onPress={() => navigation.navigate('ReservationDetail', { reservationId: item.id })} />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={list.isRefreshing} onRefresh={list.refresh} tintColor={colors.brand} />}
        ListEmptyComponent={
          list.isLoading ? (
            <LoadingView label={t('reservations.loading')} />
          ) : list.error ? (
            <ErrorView error={list.error} onRetry={list.retry} />
          ) : (
            <EmptyState
              icon="calendar-outline"
              title={status ? t('reservations.emptyFiltered') : t('reservations.empty')}
              description={
                status
                  ? t('reservations.emptyFilteredHint')
                  : role === 'RENTER'
                    ? t('reservations.emptyRenterHint')
                    : t('reservations.emptyOwnerHint')
              }
              action={
                status ? (
                  <AppButton title={t('reservations.seeAll')} variant="secondary" onPress={() => setStatus(null)} />
                ) : role === 'RENTER' ? (
                  <AppButton
                    title={t('reservations.exploreCatalog')}
                    icon="search"
                    onPress={() => navigation.navigate('Main', { screen: 'Catalog' })}
                  />
                ) : undefined
              }
            />
          )
        }
        ListFooterComponent={list.isLoadingMore ? <ActivityIndicator style={{ margin: spacing.lg }} color={colors.brand} /> : undefined}
      />
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  filters: { padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.md },
  segmented: { flexDirection: 'row', backgroundColor: colors.raised, borderRadius: radius.md, padding: 4 },
  segment: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  segmentTextActive: { color: colors.ink },
  chips: { gap: spacing.sm },
  list: { padding: spacing.lg, paddingTop: spacing.sm, flexGrow: 1 },
}))
