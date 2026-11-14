import { Ionicons } from '@expo/vector-icons'
import { useNetInfo } from '@react-native-community/netinfo'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { lightColors, spacing } from '../theme'

/** Shown on top of the app while the phone has no internet, before any request fails. Dark in both themes. */
export function OfflineBanner() {
  const { t } = useTranslation()
  const { isConnected, isInternetReachable } = useNetInfo()
  const isOffline = isConnected === false || isInternetReachable === false
  const insets = useSafeAreaInsets()
  if (!isOffline) return null

  return (
    <View style={[styles.banner, { paddingTop: insets.top + spacing.sm }]} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={16} color={lightColors.brand} />
      <Text style={styles.text}>{t('offline.banner')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: lightColors.ink,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  text: { color: '#FFFFFF', fontSize: 13, flex: 1 },
})
