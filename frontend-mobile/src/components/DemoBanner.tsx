import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { lightColors, spacing } from '../theme'

/**
 * Strip at the top of the main screens while signed in as the shared demo account: everybody trying
 * RentEquip uses the same company, so it says so and gives the test card for the payment step.
 * Yellow on asphalt in both themes, like the web's banner.
 */
export function DemoBanner() {
  const { t } = useTranslation()
  const { isDemo } = useAuth()
  if (!isDemo) return null

  return (
    <View style={styles.banner} accessibilityRole="text">
      <Ionicons name="flask-outline" size={16} color={lightColors.ink} />
      <Text style={styles.text}>
        <Text style={styles.strong}>{t('demo.bannerTitle')}</Text> {t('demo.bannerText')}{' '}
        <Text style={styles.strong}>4242 4242 4242 4242</Text>
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: lightColors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  text: { flex: 1, color: lightColors.ink, fontSize: 13, lineHeight: 18 },
  strong: { fontWeight: '700' },
})
