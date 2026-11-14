import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native'
import { AppButton } from '../../components/AppButton'
import { EquipmentCard } from '../../components/EquipmentCard'
import { EmptyState, ErrorView, LoadingView } from '../../components/StateViews'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../hooks/useAuth'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { useTheme } from '../../hooks/useTheme'
import type { RootNavigation } from '../../navigation/types'
import { companyService, equipmentService } from '../../services/rentequipApi'
import { radius, spacing } from '../../theme'
import { makeStyles } from '../../theme/makeStyles'
import type { EquipmentSummary } from '../../types/api'
import { formatCurrency } from '../../utils/format'

const PAGE_SIZE = 10

/**
 * Owner side of the marketplace: the company's numbers (published machines, requests to answer, estimated
 * revenue) and its fleet, from where each machine is edited or a new one is published.
 */
export default function FleetScreen() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const navigation = useNavigation<RootNavigation>()
  const { user } = useAuth()
  const companyId = user?.companyId

  const fetchDashboard = useCallback((signal: AbortSignal) => companyService.dashboard(signal), [])
  const dashboard = useAsync(fetchDashboard)
  const fetchPage = useCallback(
    (page: number, signal: AbortSignal) =>
      equipmentService.listByCompany(companyId ?? 0, { page, size: PAGE_SIZE }, signal),
    [companyId],
  )
  const list = usePaginatedList(fetchPage)

  // Publishing or editing happens in another screen; show the fresh fleet when coming back.
  const isFirstFocus = useRef(true)
  const refreshAll = useRef(() => {})
  useEffect(() => {
    refreshAll.current = () => {
      list.refresh()
      dashboard.refresh()
    }
  })
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false
        return
      }
      refreshAll.current()
    }, []),
  )

  const header = (
    <View style={styles.header}>
      {dashboard.data && (
        <View style={styles.metrics}>
          <Metric icon="construct-outline" label={t('fleet.published')} value={String(dashboard.data.publishedEquipment)} />
          <Metric icon="time-outline" label={t('fleet.pending')} value={String(dashboard.data.pendingRequestsAsOwner)} />
          <Metric icon="play-circle-outline" label={t('fleet.active')} value={String(dashboard.data.activeReservationsAsOwner)} />
          <Metric
            icon="cash-outline"
            label={t('fleet.revenue')}
            value={formatCurrency(dashboard.data.estimatedRevenue, dashboard.data.currency)}
          />
        </View>
      )}
      {dashboard.data && dashboard.data.pendingRequestsAsOwner > 0 && (
        <AppButton
          title={t('fleet.answerRequests')}
          icon="mail-unread-outline"
          variant="secondary"
          onPress={() => navigation.navigate('Main', { screen: 'Reservations', params: { role: 'OWNER' } })}
        />
      )}
      <AppButton title={t('fleet.publish')} icon="add-circle-outline" onPress={() => navigation.navigate('EquipmentForm', {})} />
      {list.totalElements > 0 && <Text style={styles.sectionTitle}>{t('fleet.myFleet', { n: list.totalElements })}</Text>}
    </View>
  )

  const renderItem = ({ item }: { item: EquipmentSummary }) => (
    <EquipmentCard equipment={item} onPress={() => navigation.navigate('EquipmentForm', { equipmentId: item.id })} />
  )

  return (
    <FlatList
      data={list.items}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      ListHeaderComponent={header}
      style={styles.list}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          refreshing={list.isRefreshing}
          onRefresh={() => {
            list.refresh()
            dashboard.refresh()
          }}
          tintColor={colors.brand}
        />
      }
      ListEmptyComponent={
        list.isLoading ? (
          <LoadingView label={t('fleet.loading')} />
        ) : list.error ? (
          <ErrorView error={list.error} onRetry={list.retry} />
        ) : (
          <EmptyState icon="construct-outline" title={t('fleet.empty')} description={t('fleet.emptyHint')} />
        )
      }
      ListFooterComponent={list.isLoadingMore ? <ActivityIndicator style={styles.footer} color={colors.brand} /> : undefined}
    />
  )
}

function Metric({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <View style={styles.metric} accessible accessibilityLabel={`${label}: ${value}`}>
      <Ionicons name={icon} size={20} color={colors.brandDark} />
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

const useStyles = makeStyles((colors, typography) => ({
  list: { backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1, backgroundColor: colors.background },
  header: { gap: spacing.md, marginBottom: spacing.lg },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  metricValue: { fontSize: 20, fontWeight: '800', color: colors.ink },
  metricLabel: { fontSize: 12, color: colors.muted },
  sectionTitle: { ...typography.heading, marginTop: spacing.sm },
  footer: { marginVertical: spacing.lg },
}))
