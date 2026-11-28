import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Image, Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { AppButton } from '../../components/AppButton'
import { PaymentStatusBadge, ReservationStatusBadge } from '../../components/Badge'
import { ReceiptShareButtons } from '../../components/ReceiptShareButtons'
import { PurchaseCard } from '../../components/PurchaseCard'
import { ReviewForm } from '../../components/ReviewForm'
import { ErrorView, LoadingView } from '../../components/StateViews'
import { useAction } from '../../hooks/useAction'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import type { RootScreenProps } from '../../navigation/types'
import { handoverService, reservationService } from '../../services/rentequipApi'
import { radius, spacing } from '../../theme'
import { makeStyles } from '../../theme/makeStyles'
import type { HandoverPhoto, Reservation, ReservationStatus } from '../../types/api'
import { formatCurrency, formatDate, formatDays } from '../../utils/format'

const PHOTO_STATUSES: ReservationStatus[] = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED']

/** Texts live in i18n `reservationDetail.actions.<key>`: label, confirmTitle, confirmMessage, success. */
type ActionKey = 'confirm' | 'reject' | 'start' | 'complete' | 'cancel'

interface StatusAction {
  key: ActionKey
  icon: keyof typeof Ionicons.glyphMap
  destructive?: boolean
  run: (reservation: Reservation) => Promise<Reservation>
}

const ACTIONS = {
  confirm: {
    key: 'confirm',
    icon: 'checkmark-circle-outline',
    run: (reservation) => reservationService.confirm(reservation.id),
  },
  reject: {
    key: 'reject',
    icon: 'close-circle-outline',
    destructive: true,
    run: (reservation) => reservationService.updateStatus(reservation.id, 'REJECTED'),
  },
  start: {
    key: 'start',
    icon: 'play-circle-outline',
    run: (reservation) => reservationService.updateStatus(reservation.id, 'IN_PROGRESS'),
  },
  complete: {
    key: 'complete',
    icon: 'flag-outline',
    run: (reservation) => reservationService.updateStatus(reservation.id, 'COMPLETED'),
  },
  cancel: {
    key: 'cancel',
    icon: 'trash-outline',
    destructive: true,
    run: (reservation) => reservationService.cancel(reservation.id),
  },
} satisfies Record<ActionKey, StatusAction>

/** Mirrors the backend's ReservationStatusPolicy so only possible transitions are offered. */
function availableActions(reservation: Reservation, isOwner: boolean, canManage: boolean): StatusAction[] {
  const actions: StatusAction[] = []
  if (isOwner && canManage) {
    if (reservation.status === 'PENDING') actions.push(ACTIONS.confirm, ACTIONS.reject)
    if (reservation.status === 'CONFIRMED') actions.push(ACTIONS.start)
    if (reservation.status === 'IN_PROGRESS') actions.push(ACTIONS.complete)
  }
  if (reservation.status === 'PENDING' || reservation.status === 'CONFIRMED') actions.push(ACTIONS.cancel)
  return actions
}

export default function ReservationDetailScreen({ route, navigation }: RootScreenProps<'ReservationDetail'>) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const { reservationId } = route.params
  const { user } = useAuth()
  const { run, isRunning } = useAction()
  const [viewing, setViewing] = useState<HandoverPhoto | null>(null)

  const fetchReservation = useCallback((signal: AbortSignal) => reservationService.findById(reservationId, signal), [reservationId])
  const fetchPhotos = useCallback((signal: AbortSignal) => handoverService.list(reservationId, signal), [reservationId])
  const reservation = useAsync(fetchReservation)
  const photos = useAsync(fetchPhotos)

  // New photos are taken in the camera screen and payments in the checkout; reload when coming back.
  const isFirstFocus = useRef(true)
  const reloadPhotos = photos.reload
  // `refresh` changes identity on every run; a ref keeps the focus effect from firing in a loop.
  const refreshReservation = useRef(reservation.refresh)
  useEffect(() => {
    refreshReservation.current = reservation.refresh
  })
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false
        return
      }
      reloadPhotos()
      refreshReservation.current()
    }, [reloadPhotos]),
  )

  if (reservation.isLoading) return <LoadingView label={t('reservationDetail.loading')} />
  if (reservation.error || !reservation.data) {
    return reservation.error ? <ErrorView error={reservation.error} onRetry={reservation.reload} /> : null
  }

  const data = reservation.data
  const isOwner = data.renterCompanyId !== user?.companyId
  const canManage = user?.role !== 'OPERATOR'
  const actions = availableActions(data, isOwner, canManage)
  const canTakePhotos = PHOTO_STATUSES.includes(data.status)
  // Same rule as the web: the renter pays while the request is pending or confirmed and still unpaid.
  const canPay = !isOwner && data.paymentStatus === 'UNPAID' && (data.status === 'PENDING' || data.status === 'CONFIRMED')
  const money = (amount: number) => formatCurrency(amount, data.currency)

  function askAndRun(action: StatusAction) {
    const texts = `reservationDetail.actions.${action.key}` as const
    Alert.alert(t(`${texts}.confirmTitle`), t(`${texts}.confirmMessage`), [
      { text: t('common.back'), style: 'cancel' },
      {
        text: t(`${texts}.label`),
        style: action.destructive ? 'destructive' : 'default',
        onPress: () =>
          void run(() => action.run(data), { successMessage: t(`${texts}.success`), onSuccess: reservation.reload }),
      },
    ])
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={reservation.isRefreshing}
          tintColor={colors.brand}
          onRefresh={() => {
            reservation.refresh()
            photos.reload()
          }}
        />
      }
    >
      <View style={styles.card}>
        <Text style={styles.code}>{t('reservationDetail.code', { id: data.id })}</Text>
        <Pressable onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: data.equipmentId, name: data.equipmentName })}>
          <Text style={styles.title}>{data.equipmentName} ›</Text>
        </Pressable>
        <View style={styles.badges}>
          <ReservationStatusBadge status={data.status} />
          <PaymentStatusBadge status={data.paymentStatus} />
        </View>
        <Line icon="calendar-outline" text={`${formatDate(data.startDate)} – ${formatDate(data.endDate)} (${formatDays(data.totalDays)})`} />
        <Line icon="business-outline" text={t('reservationDetail.renter', { company: data.renterCompanyName })} />
        {data.notes && <Line icon="chatbubble-ellipses-outline" text={data.notes} />}
      </View>

      <View style={styles.card}>
        <Amount
          label={t('reservationDetail.rental', { rate: money(data.dailyRate), days: data.totalDays })}
          value={money(data.rentalAmount)}
        />
        <Amount label={t('reservationDetail.deposit')} value={money(data.securityDeposit)} />
        <Amount label={t('reservationDetail.total')} value={money(data.totalAmount)} bold />
        {canPay && (
          <AppButton
            title={t('reservationDetail.pay')}
            icon="card-outline"
            onPress={() => navigation.navigate('Payment', { reservationId: data.id })}
          />
        )}
      </View>

      {!isOwner && data.paymentStatus === 'PAID' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('reservationDetail.receipt')}</Text>
          <Text style={styles.caption}>{t('reservationDetail.receiptHint')}</Text>
          <ReceiptShareButtons reservationId={data.id} />
        </View>
      )}

      {!isOwner && data.status === 'COMPLETED' && <ReviewForm reservationId={data.id} />}

      {!isOwner && <PurchaseCard reservationId={data.id} />}

      {actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map((action) => (
            <AppButton
              key={action.key}
              title={t(`reservationDetail.actions.${action.key}.label`)}
              icon={action.icon}
              variant={action.destructive ? 'secondary' : 'primary'}
              onPress={() => askAndRun(action)}
              isLoading={isRunning}
            />
          ))}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('reservationDetail.photos')}</Text>
        <Text style={styles.caption}>{t('reservationDetail.photosHint')}</Text>
        {canTakePhotos ? (
          <View style={styles.photoButtons}>
            <AppButton
              title={t('reservationDetail.deliveryPhoto')}
              icon="camera-outline"
              variant="secondary"
              style={styles.flex}
              onPress={() => navigation.navigate('HandoverCamera', { reservationId: data.id, stage: 'DELIVERY' })}
            />
            <AppButton
              title={t('reservationDetail.returnPhoto')}
              icon="camera-reverse-outline"
              variant="secondary"
              style={styles.flex}
              onPress={() => navigation.navigate('HandoverCamera', { reservationId: data.id, stage: 'RETURN' })}
            />
          </View>
        ) : (
          <Text style={styles.caption}>{t('reservationDetail.photosLater')}</Text>
        )}

        {photos.isLoading ? (
          <LoadingView label={t('reservationDetail.loadingPhotos')} />
        ) : photos.error ? (
          <ErrorView error={photos.error} onRetry={photos.reload} />
        ) : (photos.data ?? []).length === 0 ? (
          <Text style={styles.caption}>{t('reservationDetail.noPhotos')}</Text>
        ) : (
          <View style={styles.grid}>
            {(photos.data ?? []).map((photo) => (
              <Pressable
                key={photo.id}
                style={styles.thumb}
                onPress={() => setViewing(photo)}
                accessibilityLabel={t('reservationDetail.photoOf', { stage: t(`handoverStage.${photo.stage}`) })}
              >
                <Image source={{ uri: photo.imageUrl }} style={styles.thumbImage} />
                <Text style={styles.thumbLabel}>{t(`handoverStage.${photo.stage}`)}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Modal visible={viewing !== null} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewing(null)} accessibilityLabel={t('reservationDetail.closePhoto')}>
          {viewing && (
            <>
              <Image source={{ uri: viewing.imageUrl }} style={styles.viewerImage} resizeMode="contain" />
              <View style={styles.viewerInfo}>
                <Text style={styles.viewerTitle}>
                  {t(`handoverStage.${viewing.stage}`)} · {viewing.uploadedByCompanyName}
                </Text>
                <Text style={styles.viewerText}>{viewing.createdAt.replace('T', ' ').slice(0, 16)}</Text>
                {viewing.latitude !== null && viewing.longitude !== null && (
                  <Text style={styles.viewerText}>
                    📍 {viewing.latitude.toFixed(5)}, {viewing.longitude.toFixed(5)}
                  </Text>
                )}
                {viewing.note && <Text style={styles.viewerText}>{viewing.note}</Text>}
              </View>
            </>
          )}
        </Pressable>
      </Modal>
    </ScrollView>
  )
}

function Line({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <View style={styles.line}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <Text style={styles.lineText}>{text}</Text>
    </View>
  )
}

function Amount({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const styles = useStyles()
  return (
    <View style={styles.amount}>
      <Text style={[styles.amountLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.amountValue, bold && styles.bold]}>{value}</Text>
    </View>
  )
}

const useStyles = makeStyles((colors, typography) => ({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 48 },
  flex: { flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  code: typography.caption,
  title: typography.heading,
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  line: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  lineText: { flex: 1, fontSize: 14, color: colors.text },
  amount: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  amountLabel: { flex: 1, fontSize: 14, color: colors.muted },
  amountValue: { fontSize: 14, color: colors.ink, fontWeight: '600' },
  bold: { fontWeight: '800', color: colors.ink, fontSize: 16 },
  actions: { gap: spacing.sm },
  sectionTitle: typography.heading,
  caption: typography.caption,
  photoButtons: { flexDirection: 'row', gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { width: '31%', gap: 4 },
  thumbImage: { width: '100%', aspectRatio: 1, borderRadius: radius.sm, backgroundColor: colors.border },
  thumbLabel: { fontSize: 11, color: colors.muted, textAlign: 'center' },
  viewer: { flex: 1, backgroundColor: 'rgba(15,23,42,0.95)', justifyContent: 'center', padding: spacing.lg, gap: spacing.lg },
  viewerImage: { width: '100%', height: '65%' },
  viewerInfo: { gap: 4 },
  viewerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  viewerText: { color: '#CBD5E1', fontSize: 14 },
}))
