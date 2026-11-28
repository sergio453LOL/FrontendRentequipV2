import { Ionicons } from '@expo/vector-icons'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'
import { OfflineBanner } from '../components/OfflineBanner'
import { LoadingView } from '../components/StateViews'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import AssistantScreen from '../screens/assistant/AssistantScreen'
import LoginScreen from '../screens/auth/LoginScreen'
import RegisterScreen from '../screens/auth/RegisterScreen'
import HandoverCameraScreen from '../screens/camera/HandoverCameraScreen'
import CatalogScreen from '../screens/catalog/CatalogScreen'
import EquipmentDetailScreen from '../screens/catalog/EquipmentDetailScreen'
import EquipmentFormScreen from '../screens/fleet/EquipmentFormScreen'
import FleetScreen from '../screens/fleet/FleetScreen'
import MapScreen from '../screens/map/MapScreen'
import NotificationsScreen from '../screens/notifications/NotificationsScreen'
import OffersScreen from '../screens/offers/OffersScreen'
import PurchasesScreen from '../screens/purchases/PurchasesScreen'
import PaymentScreen from '../screens/payments/PaymentScreen'
import CategoriesScreen from '../screens/profile/CategoriesScreen'
import ProfileScreen from '../screens/profile/ProfileScreen'
import ReservationDetailScreen from '../screens/reservations/ReservationDetailScreen'
import ReservationsScreen from '../screens/reservations/ReservationsScreen'
import { notificationService } from '../services/rentequipApi'
import { radius, spacing } from '../theme'
import { makeStyles } from '../theme/makeStyles'
import { canPublish } from '../utils/roles'
import type { AuthStackParamList, MainTabParamList, RootNavigation, RootStackParamList } from './types'

const RootStack = createNativeStackNavigator<RootStackParamList>()
const AuthStack = createNativeStackNavigator<AuthStackParamList>()
const Tabs = createBottomTabNavigator<MainTabParamList>()

const TAB_ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Catalog: 'search',
  Map: 'map',
  Fleet: 'construct',
  Reservations: 'calendar',
  Profile: 'person-circle',
}

/** Header button that opens the assistant from the screens where people look for machines. */
function AssistantButton() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const navigation = useNavigation<RootNavigation>()
  return (
    <Pressable
      onPress={() => navigation.navigate('Assistant')}
      accessibilityRole="button"
      accessibilityLabel={t('nav.openAssistant')}
      hitSlop={8}
      style={styles.headerButton}
    >
      <Ionicons name="sparkles" size={18} color={colors.brandDark} />
      <Text style={styles.headerButtonText}>{t('nav.assistant')}</Text>
    </Pressable>
  )
}

/** Bell with the unread count; refreshed each time the screen comes into view. */
function NotificationsButton() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const navigation = useNavigation<RootNavigation>()
  const [unread, setUnread] = useState(0)
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController()
      notificationService.unreadCount(controller.signal).then(setUnread, () => undefined)
      return () => controller.abort()
    }, []),
  )
  return (
    <Pressable
      onPress={() => navigation.navigate('Notifications')}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? t('nav.notificationsUnread', { n: unread }) : t('nav.notifications')}
      hitSlop={8}
      style={styles.bell}
    >
      <Ionicons name={unread > 0 ? 'notifications' : 'notifications-outline'} size={22} color={colors.ink} />
      {unread > 0 && (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </Pressable>
  )
}

function HeaderActions({ withAssistant }: { withAssistant?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <NotificationsButton />
      {withAssistant && <AssistantButton />}
    </View>
  )
}
const CatalogHeader = () => <HeaderActions withAssistant />
const PlainHeader = () => <HeaderActions />

function AuthNavigator() {
  const { t } = useTranslation()
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ headerShown: true, title: t('nav.register'), headerBackTitle: t('common.back') }}
      />
    </AuthStack.Navigator>
  )
}

function MainTabs() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { user } = useAuth()
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.brandDark,
        tabBarInactiveTintColor: colors.muted,
        headerTitleStyle: { fontWeight: '700' },
        tabBarIcon: ({ color, size }) => <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />,
      })}
    >
      <Tabs.Screen name="Catalog" component={CatalogScreen} options={{ title: t('nav.catalog'), headerRight: CatalogHeader }} />
      <Tabs.Screen name="Map" component={MapScreen} options={{ title: t('nav.map'), headerRight: CatalogHeader }} />
      {canPublish(user?.role) && <Tabs.Screen name="Fleet" component={FleetScreen} options={{ title: t('nav.fleet') }} />}
      <Tabs.Screen name="Reservations" component={ReservationsScreen} options={{ title: t('nav.reservations'), headerRight: PlainHeader }} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: t('nav.profile'), headerRight: PlainHeader }} />
    </Tabs.Navigator>
  )
}

/**
 * Signed out: only the auth stack exists, so a stale deep link can never open a private screen.
 * Signed in: tabs plus the detail and camera screens pushed above them.
 */
export function AppNavigator() {
  const { t } = useTranslation()
  const { status } = useAuth()
  if (status === 'restoring') return <LoadingView label={t('nav.opening')} />

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <RootStack.Navigator screenOptions={{ headerBackTitle: t('common.back') }}>
        {status === 'signedOut' ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} options={{ headerShown: false }} />
        ) : (
          <>
            <RootStack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <RootStack.Screen
              name="EquipmentDetail"
              component={EquipmentDetailScreen}
              options={({ route }) => ({ title: route.params.name ?? t('nav.equipment') })}
            />
            <RootStack.Screen name="ReservationDetail" component={ReservationDetailScreen} options={{ title: t('nav.reservation') }} />
            <RootStack.Screen
              name="HandoverCamera"
              component={HandoverCameraScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <RootStack.Screen
              name="Payment"
              component={PaymentScreen}
              options={({ route }) => ({ title: route.params.purchase ? t('nav.purchasePayment') : t('nav.payment') })}
            />
            <RootStack.Screen
              name="Assistant"
              component={AssistantScreen}
              options={{ title: t('nav.assistantTitle'), presentation: 'modal' }}
            />
            <RootStack.Screen
              name="EquipmentForm"
              component={EquipmentFormScreen}
              options={({ route }) => ({ title: route.params.equipmentId ? t('nav.editEquipment') : t('nav.publishEquipment') })}
            />
            <RootStack.Screen name="Categories" component={CategoriesScreen} options={{ title: t('nav.categories') }} />
            <RootStack.Screen name="Offers" component={OffersScreen} options={{ title: t('nav.offers') }} />
            <RootStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: t('nav.notifications') }} />
            <RootStack.Screen name="Purchases" component={PurchasesScreen} options={{ title: t('nav.purchases') }} />
          </>
        )}
      </RootStack.Navigator>
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
  },
  headerButtonText: { fontSize: 13, fontWeight: '700', color: colors.brandDark },
  bell: { marginRight: spacing.md, padding: 2 },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
}))
