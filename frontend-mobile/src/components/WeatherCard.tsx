import { Ionicons } from '@expo/vector-icons'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Text, View } from 'react-native'
import { useAsync } from '../hooks/useAsync'
import { useTheme } from '../hooks/useTheme'
import { weatherService } from '../services/weatherService'
import { radius, spacing } from '../theme'
import { makeStyles } from '../theme/makeStyles'
import type { Coordinates } from '../utils/format'

/** Forecast for the work site from the Open-Meteo API, with an advice relevant to construction. */
export function WeatherCard({ coords, place }: { coords: Coordinates; place: string }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const { latitude, longitude } = coords
  const fetchWeather = useCallback(
    (signal: AbortSignal) => weatherService.forSite({ latitude, longitude }, signal),
    [latitude, longitude],
  )
  const { data, isLoading, error } = useAsync(fetchWeather)

  if (error) return null
  return (
    <View style={styles.card} accessibilityLabel={t('weather.label')}>
      {isLoading || !data ? (
        <ActivityIndicator color={colors.info} />
      ) : (
        <>
          <View style={styles.row}>
            <Ionicons name="partly-sunny-outline" size={28} color={colors.info} />
            <View style={styles.flex}>
              <Text style={styles.title}>
                {data.temperature}°C · {t(data.descriptionKey)}
              </Text>
              <Text style={styles.caption}>
                {t('weather.summary', { place, rain: data.rainProbabilityToday, wind: data.windSpeedKmh })}
              </Text>
            </View>
          </View>
          <Text style={styles.advice}>{t(data.adviceKey)}</Text>
        </>
      )}
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  card: { backgroundColor: colors.infoSoft, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, minHeight: 56, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink },
  caption: { fontSize: 12, color: colors.muted },
  advice: { fontSize: 13, color: colors.infoText },
}))
