import { Ionicons } from '@expo/vector-icons'
import { useCallback, useLayoutEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { EmptyState, ErrorView, LoadingView } from '../../components/StateViews'
import i18n from '../../i18n'
import { useAction } from '../../hooks/useAction'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { useTheme } from '../../hooks/useTheme'
import type { RootNavigation, RootScreenProps } from '../../navigation/types'
import { notificationService } from '../../services/rentequipApi'
import { radius, spacing } from '../../theme'
import { makeStyles } from '../../theme/makeStyles'
import type { AppNotification, ReservationRole } from '../../types/api'

/** Opens the screen a notification points to (the backend writes web paths such as /offers?role=OWNER). */
export function openNotificationLink(link: string | null, navigation: Pick<RootNavigation, 'navigate'>): void {
  if (!link) return
  const role: ReservationRole = /role=OWNER/.test(link) ? 'OWNER' : 'RENTER'
  if (link.startsWith('/offers')) navigation.navigate('Offers', { role })
  else if (link.startsWith('/purchase')) navigation.navigate('Purchases', { role })
  else if (link.startsWith('/reservations')) navigation.navigate('Main', { screen: 'Reservations', params: { role } })
}

function timeAgo(iso: string): string {
  const t = i18n.t.bind(i18n)
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return t('notifications.justNow')
  if (minutes < 60) return t('notifications.minutesAgo', { n: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return t('notifications.hoursAgo', { n: hours })
  return t('notifications.daysAgo', { n: Math.round(hours / 24) })
}

/** The company's inbox: reservation and offer events, newest first. Tapping one marks it read and opens it. */
export default function NotificationsScreen({ navigation }: RootScreenProps<'Notifications'>) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const { run } = useAction()

  const fetchPage = useCallback((page: number, signal: AbortSignal) => notificationService.list(page, signal), [])
  const list = usePaginatedList(fetchPage)
  const { refresh } = list
  const hasUnread = list.items.some((item) => !item.read)

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: hasUnread
        ? () => (
            <Pressable
              onPress={() => void run(() => notificationService.markAllRead(), { onSuccess: refresh })}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={styles.markAll}>{t('notifications.markAll')}</Text>
            </Pressable>
          )
        : undefined,
    })
  }, [navigation, hasUnread, run, refresh, styles.markAll, t])

  function open(item: AppNotification) {
    if (!item.read) void notificationService.markRead(item.id).then(refresh, () => undefined)
    openNotificationLink(item.link, navigation)
  }

  return (
    <FlatList
      style={styles.container}
      data={list.items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <Pressable onPress={() => open(item)} accessibilityRole="button" style={[styles.item, !item.read && styles.unread]}>
          <View style={[styles.dot, item.read && styles.dotRead]} />
          <View style={styles.body}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
          </View>
          {item.link && <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
        </Pressable>
      )}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={list.isRefreshing} onRefresh={list.refresh} tintColor={colors.brand} />}
      ListEmptyComponent={
        list.isLoading ? (
          <LoadingView label={t('notifications.loading')} />
        ) : list.error ? (
          <ErrorView error={list.error} onRetry={list.retry} />
        ) : (
          <EmptyState icon="notifications-outline" title={t('notifications.empty')} description={t('notifications.emptyHint')} />
        )
      }
      ListFooterComponent={list.isLoadingMore ? <ActivityIndicator style={{ margin: spacing.lg }} color={colors.brand} /> : undefined}
    />
  )
}

const useStyles = makeStyles((colors, typography) => ({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, flexGrow: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  unread: { borderColor: colors.brand },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },
  dotRead: { backgroundColor: 'transparent' },
  body: { flex: 1, gap: 2 },
  title: { ...typography.body, fontWeight: '700', color: colors.ink },
  message: { ...typography.body, fontSize: 14 },
  time: { fontSize: 12, color: colors.muted },
  markAll: { fontSize: 14, fontWeight: '700', color: colors.brandDark, marginRight: spacing.md },
}))
