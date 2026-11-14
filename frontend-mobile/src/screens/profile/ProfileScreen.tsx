import { Ionicons } from '@expo/vector-icons'
import { useNetInfo } from '@react-native-community/netinfo'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useCameraPermissions } from 'expo-camera'
import * as Location from 'expo-location'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Linking, ScrollView, Text, View } from 'react-native'
import { AppButton } from '../../components/AppButton'
import { PreferencesPicker } from '../../components/PreferencesPicker'
import { API_BASE_URL } from '../../config/env'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import type { RootNavigation } from '../../navigation/types'
import { radius, spacing, type Palette } from '../../theme'
import { makeStyles } from '../../theme/makeStyles'
import { canManageCategories } from '../../utils/roles'

type PermissionState = 'granted' | 'denied' | 'undetermined'

function permissionColor(state: PermissionState, colors: Palette): string {
  if (state === 'granted') return colors.success
  if (state === 'denied') return colors.danger
  return colors.muted
}

export default function ProfileScreen() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const navigation = useNavigation<RootNavigation>()
  const { user, logout } = useAuth()
  const { isConnected } = useNetInfo()
  const [cameraPermission] = useCameraPermissions()
  const [locationPermission, setLocationPermission] = useState<PermissionState>('undetermined')

  // Reflect changes the user makes in the system settings when coming back to the app.
  useFocusEffect(
    useCallback(() => {
      void Location.getForegroundPermissionsAsync().then((result) => setLocationPermission(result.status as PermissionState))
    }, []),
  )

  if (!user) return null
  const cameraState = (cameraPermission?.status as PermissionState | undefined) ?? 'undetermined'

  function confirmLogout() {
    Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logout'), style: 'destructive', onPress: () => void logout() },
    ])
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.companyName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.company}>{user.companyName}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>{t(`profile.roles.${user.role}`)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('preferences.title')}</Text>
        <PreferencesPicker />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('profile.permissions')}</Text>
        <Row
          icon="navigate-outline"
          label={t('profile.location')}
          value={t(`profile.permission.${locationPermission}`)}
          color={permissionColor(locationPermission, colors)}
        />
        <Row
          icon="camera-outline"
          label={t('profile.camera')}
          value={t(`profile.permission.${cameraState}`)}
          color={permissionColor(cameraState, colors)}
        />
        <AppButton title={t('profile.managePermissions')} icon="settings-outline" variant="secondary" onPress={() => void Linking.openSettings()} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('profile.connection')}</Text>
        <Row
          icon={isConnected === false ? 'cloud-offline-outline' : 'cloud-done-outline'}
          label={t('profile.internet')}
          value={isConnected === false ? t('profile.offline') : t('profile.online')}
          color={isConnected === false ? colors.danger : colors.success}
        />
        <Text style={styles.server}>{t('common.server', { url: API_BASE_URL })}</Text>
      </View>

      {canManageCategories(user.role) && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('profile.admin')}</Text>
          <Text style={styles.server}>{t('profile.adminHint')}</Text>
          <AppButton
            title={t('profile.categories')}
            icon="pricetags-outline"
            variant="secondary"
            onPress={() => navigation.navigate('Categories')}
          />
        </View>
      )}

      <AppButton title={t('profile.logout')} icon="log-out-outline" variant="danger" onPress={confirmLogout} />
    </ScrollView>
  )
}

function Row({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) {
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={colors.muted} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color }]}>{value}</Text>
    </View>
  )
}

const useStyles = makeStyles((colors, typography) => ({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  avatarText: { fontSize: 34, fontWeight: '800', color: colors.onBrand },
  company: typography.title,
  email: typography.caption,
  rolePill: { marginTop: spacing.sm, backgroundColor: colors.brandSoft, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  roleText: { fontSize: 13, fontWeight: '700', color: colors.brandDark },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  sectionTitle: typography.heading,
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowLabel: { flex: 1, fontSize: 15, color: colors.text },
  rowValue: { fontSize: 14, fontWeight: '700' },
  server: { ...typography.caption, fontSize: 12 },
}))
