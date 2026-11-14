import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native'
import { AppButton } from '../../components/AppButton'
import { Chip } from '../../components/Chip'
import { EquipmentCard } from '../../components/EquipmentCard'
import { EmptyState, ErrorView, LoadingView } from '../../components/StateViews'
import { WeatherCard } from '../../components/WeatherCard'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../hooks/useAuth'
import { useCurrentLocation } from '../../hooks/useCurrentLocation'
import { useDebounce } from '../../hooks/useDebounce'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import { useTheme } from '../../hooks/useTheme'
import type { RootNavigation } from '../../navigation/types'
import { categoryService, equipmentService } from '../../services/rentequipApi'
import { radius, spacing } from '../../theme'
import { makeStyles } from '../../theme/makeStyles'
import type { EquipmentSummary } from '../../types/api'
import { distanceKm } from '../../utils/format'

const PAGE_SIZE = 10
/** `null` means "whole country": the backend then lists everything ordered from Lima. */
const RADIUS_OPTIONS: (number | null)[] = [10, 25, 50, 100, null]

export default function CatalogScreen() {
  const { t } = useTranslation()
  const { colors, scheme } = useTheme()
  const styles = useStyles()
  const navigation = useNavigation<RootNavigation>()
  const { user } = useAuth()
  const location = useCurrentLocation()
  const [query, setQuery] = useState('')
  const [radiusKm, setRadiusKm] = useState<number | null>(25)
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const debouncedQuery = useDebounce(query.trim(), 400)
  const fetchCategories = useCallback((signal: AbortSignal) => categoryService.list(signal), [])
  const categories = useAsync(fetchCategories)

  // With the real GPS position we search around the phone; without it, the whole catalogue.
  const useGps = !location.isFallback && radiusKm !== null
  const { latitude, longitude } = location.coords
  const companyId = user?.companyId

  const fetchPage = useCallback(
    (page: number, signal: AbortSignal) =>
      equipmentService.search(
        {
          latitude: useGps ? latitude : undefined,
          longitude: useGps ? longitude : undefined,
          radiusKm: useGps ? (radiusKm ?? undefined) : undefined,
          q: debouncedQuery || undefined,
          categoryId: categoryId ?? undefined,
          excludeOwnerId: companyId,
          page,
          size: PAGE_SIZE,
        },
        signal,
      ),
    [useGps, latitude, longitude, radiusKm, debouncedQuery, categoryId, companyId],
  )
  const list = usePaginatedList(fetchPage)

  if (location.status === 'locating') return <LoadingView label={t('catalog.locating')} />

  const header = (
    <View style={styles.header}>
      <WeatherCard coords={location.coords} place={location.isFallback ? 'Lima' : t('catalog.yourLocation')} />

      {location.message && (
        <View style={styles.locationBanner} accessibilityRole="alert">
          <Ionicons name="navigate-circle-outline" size={20} color={colors.brandDark} />
          <Text style={styles.locationText}>{location.message}</Text>
          <Pressable onPress={location.requestAccess} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.locationAction}>{t('catalog.enableLocation')}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('catalog.searchPlaceholder')}
          placeholderTextColor={colors.muted}
          keyboardAppearance={scheme}
          style={styles.searchInput}
          accessibilityLabel={t('catalog.searchLabel')}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} accessibilityLabel={t('catalog.clearSearch')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {!location.isFallback && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {RADIUS_OPTIONS.map((option) => (
            <Chip
              key={option ?? 'all'}
              label={option === null ? t('catalog.wholeCountry') : `${option} km`}
              selected={radiusKm === option}
              onPress={() => setRadiusKm(option)}
            />
          ))}
        </ScrollView>
      )}

      {(categories.data ?? []).length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label={t('catalog.allCategories')} selected={categoryId === null} onPress={() => setCategoryId(null)} />
          {(categories.data ?? []).map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              selected={categoryId === category.id}
              onPress={() => setCategoryId(categoryId === category.id ? null : category.id)}
            />
          ))}
        </ScrollView>
      )}

      {!list.isLoading && !list.error && list.totalElements > 0 && (
        <Text style={styles.count}>
          {t(list.totalElements === 1 ? 'catalog.resultOne' : 'catalog.resultMany', { n: list.totalElements })}
        </Text>
      )}
    </View>
  )

  const renderItem = ({ item }: { item: EquipmentSummary }) => (
    <EquipmentCard
      equipment={item}
      distanceKm={location.isFallback ? undefined : distanceKm(location.coords, item)}
      onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: item.id, name: item.name })}
    />
  )

  return (
    <FlatList
      data={list.items}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      ListHeaderComponent={header}
      contentContainerStyle={styles.content}
      style={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={list.isRefreshing} onRefresh={list.refresh} tintColor={colors.brand} />}
      ListEmptyComponent={
        list.isLoading ? (
          <LoadingView label={t('catalog.searching')} />
        ) : list.error ? (
          <ErrorView error={list.error} onRetry={list.retry} />
        ) : (
          <EmptyState
            icon="search-outline"
            title={debouncedQuery || categoryId !== null ? t('catalog.noResults') : t('catalog.nothingNearby')}
            description={
              debouncedQuery
                ? t('catalog.noResultsFor', { query: debouncedQuery })
                : categoryId !== null
                  ? t('catalog.noResultsCategory')
                  : t('catalog.widenRadius')
            }
            action={
              debouncedQuery ? (
                <AppButton title={t('catalog.clearSearch')} variant="secondary" onPress={() => setQuery('')} />
              ) : categoryId !== null ? (
                <AppButton title={t('catalog.allCategoriesAction')} variant="secondary" onPress={() => setCategoryId(null)} />
              ) : radiusKm !== null ? (
                <AppButton title={t('catalog.seeWholeCountry')} variant="secondary" onPress={() => setRadiusKm(null)} />
              ) : undefined
            }
          />
        )
      }
      ListFooterComponent={
        list.isLoadingMore ? (
          <ActivityIndicator style={styles.footer} color={colors.brand} />
        ) : list.error && list.items.length > 0 ? (
          <AppButton title={t('common.retry')} variant="secondary" icon="refresh" onPress={list.retry} style={styles.footer} />
        ) : undefined
      }
    />
  )
}

const useStyles = makeStyles((colors) => ({
  list: { backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1, backgroundColor: colors.background },
  header: { gap: spacing.md, marginBottom: spacing.lg },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  locationText: { flex: 1, fontSize: 13, color: colors.text },
  locationAction: { fontSize: 14, fontWeight: '700', color: colors.brandDark },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: spacing.sm },
  chips: { gap: spacing.sm },
  count: { fontSize: 13, color: colors.muted },
  footer: { marginVertical: spacing.lg },
}))
