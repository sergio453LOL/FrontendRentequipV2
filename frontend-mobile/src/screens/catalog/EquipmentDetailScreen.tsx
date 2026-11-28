import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import { AppButton } from '../../components/AppButton'
import { EquipmentStatusBadge } from '../../components/Badge'
import { DateField } from '../../components/DateField'
import { EquipmentImage } from '../../components/EquipmentCard'
import { EquipmentBadges, EquipmentExtras, OfferForm, ReviewsSection } from '../../components/EquipmentExtras'
import { ErrorView, LoadingView } from '../../components/StateViews'
import { TextField } from '../../components/TextField'
import { useAction } from '../../hooks/useAction'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../hooks/useAuth'
import { useDebounce } from '../../hooks/useDebounce'
import { useTheme } from '../../hooks/useTheme'
import type { RootScreenProps } from '../../navigation/types'
import { equipmentService, reservationService } from '../../services/rentequipApi'
import { radius, spacing } from '../../theme'
import { makeStyles } from '../../theme/makeStyles'
import type { Equipment, IsoDate } from '../../types/api'
import { addDaysIso, firstFreeRange, formatCurrency, formatDays, rentalDays, todayIso } from '../../utils/format'
import { photoCredit } from '../../utils/photoCredits'

const MAX_RENTAL_DAYS = 365
const MAX_NOTES = 500
/** Length of the stretch the form proposes before the renter picks dates. */
const PROPOSED_DAYS = 3
/** The backend serves at most 120 days of calendar per request. */
const BLOCKED_HORIZON_DAYS = 119

/** An accepted price offer the renter is booking with: its id and agreed daily rate. */
interface AgreedOffer {
  id: number
  dailyRate: number
}

function parseSpecifications(text: string | null): { label: string; value: string }[] {
  if (!text) return []
  return text
    .split(/\r?\n/)
    .map((line) => line.split(':'))
    .filter((parts) => parts.length >= 2 && parts[0].trim() && parts.slice(1).join(':').trim())
    .map((parts) => ({ label: parts[0].trim(), value: parts.slice(1).join(':').trim() }))
}

function Gallery({ images, width }: { images: string[]; width: number }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const [index, setIndex] = useState(0)
  if (images.length === 0) return <EquipmentImage uri={null} height={240} />
  const credit = photoCredit(images[index])
  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        accessibilityLabel={t('equipmentDetail.gallery', { n: images.length })}
      >
        {images.map((uri) => (
          <View key={uri} style={{ width }}>
            <EquipmentImage uri={uri} height={240} />
          </View>
        ))}
      </ScrollView>
      {images.length > 1 && (
        <View style={styles.dots}>
          {images.map((uri, dotIndex) => (
            <View key={uri} style={[styles.dot, dotIndex === index && styles.dotActive]} />
          ))}
        </View>
      )}
      {credit && <Text style={styles.photoCredit}>{credit}</Text>}
    </View>
  )
}

function ReservationForm({ equipment, offer, onBooked }: { equipment: Equipment; offer?: AgreedOffer; onBooked: () => void }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const [startDate, setStartDate] = useState<IsoDate | null>(null)
  const [endDate, setEndDate] = useState<IsoDate | null>(null)
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const { run, isRunning } = useAction()
  const dailyRate = offer?.dailyRate ?? equipment.dailyRate

  // Proposes the first free stretch from tomorrow, so the renter starts from dates that work.
  useEffect(() => {
    const controller = new AbortController()
    const from = addDaysIso(todayIso(), 1)
    equipmentService.blockedDates(equipment.id, from, addDaysIso(from, BLOCKED_HORIZON_DAYS), controller.signal).then(
      (windows) => {
        const range = firstFreeRange(PROPOSED_DAYS, windows, from, BLOCKED_HORIZON_DAYS - PROPOSED_DAYS)
        if (!range) return
        setStartDate((current) => current ?? range.startDate)
        setEndDate((current) => current ?? range.endDate)
      },
      () => undefined,
    )
    return () => controller.abort()
  }, [equipment.id])

  const today = todayIso()
  // i18n keys, translated by DateField.
  const startError =
    submitted && !startDate ? 'validation.startDateRequired' : startDate && startDate < today ? 'validation.startDatePast' : undefined
  const endError =
    submitted && !endDate
      ? 'validation.endDateRequired'
      : startDate && endDate && endDate < startDate
        ? 'validation.endBeforeStart'
        : startDate && endDate && rentalDays(startDate, endDate) > MAX_RENTAL_DAYS
          ? 'validation.maxRentalDays'
          : undefined
  const datesValid = Boolean(startDate && endDate && !startError && !endError)
  const days = datesValid && startDate && endDate ? rentalDays(startDate, endDate) : 0

  const range = useDebounce(datesValid ? `${startDate}|${endDate}` : null, 300)
  const checkAvailability = useCallback(
    (signal: AbortSignal) => {
      const [from, to] = (range ?? '').split('|')
      return reservationService.availability(equipment.id, from, to, signal)
    },
    [equipment.id, range],
  )
  const availability = useAsync(range ? checkAvailability : null)
  const isChecking = datesValid && (availability.isLoading || range !== `${startDate}|${endDate}`)
  const isTaken = datesValid && !isChecking && availability.data?.available === false

  async function submit() {
    setSubmitted(true)
    if (!datesValid || !startDate || !endDate || isTaken) return
    await run(
      () =>
        reservationService.create({ equipmentId: equipment.id, startDate, endDate, notes: notes.trim() || undefined, offerId: offer?.id }),
      { successMessage: t('equipmentDetail.requestSent'), errorTitle: t('equipmentDetail.requestFailed'), onSuccess: onBooked },
    )
  }

  const money = (amount: number) => formatCurrency(amount, equipment.currency)

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('equipmentDetail.requestTitle')}</Text>
      {offer && <Text style={styles.free}>✓ {t('offers.bookingAtAgreed', { rate: money(offer.dailyRate) })}</Text>}
      <View style={styles.dates}>
        <DateField label={t('equipmentDetail.from')} value={startDate} onChange={setStartDate} minimumDate={new Date()} error={startError} />
        <DateField label={t('equipmentDetail.to')} value={endDate} onChange={setEndDate} minimumDate={new Date()} error={endError} />
      </View>
      {datesValid && (
        <View style={styles.availability} accessibilityLiveRegion="polite">
          {isChecking ? (
            <Text style={styles.muted}>{t('equipmentDetail.checking')}</Text>
          ) : isTaken ? (
            <Text style={styles.taken}>{t('equipmentDetail.taken')}</Text>
          ) : availability.data?.available ? (
            <Text style={styles.free}>✓ {t('equipmentDetail.available')}</Text>
          ) : null}
        </View>
      )}
      <TextField
        label={t('equipmentDetail.notes')}
        value={notes}
        onChangeText={setNotes}
        placeholder={t('equipmentDetail.notesPlaceholder')}
        multiline
        maxLength={MAX_NOTES}
        hint={`${notes.length}/${MAX_NOTES}`}
        style={styles.notes}
      />
      <View style={styles.summary}>
        <Row label={`${money(dailyRate)} × ${formatDays(days)}`} value={money(days * dailyRate)} />
        <Row label={t('equipmentDetail.deposit')} value={money(equipment.securityDeposit)} />
        <Row label={t('equipmentDetail.estimatedTotal')} value={money(days * dailyRate + equipment.securityDeposit)} bold />
      </View>
      <AppButton title={t('equipmentDetail.send')} icon="send" onPress={submit} isLoading={isRunning} disabled={isChecking || isTaken} />
    </View>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const styles = useStyles()
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold]}>{value}</Text>
    </View>
  )
}

export default function EquipmentDetailScreen({ route, navigation }: RootScreenProps<'EquipmentDetail'>) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const { equipmentId, offerId, agreedDailyRate } = route.params
  const offer = offerId && agreedDailyRate ? { id: offerId, dailyRate: agreedDailyRate } : undefined
  const { user } = useAuth()
  const { width } = useWindowDimensions()

  const fetchEquipment = useCallback((signal: AbortSignal) => equipmentService.findById(equipmentId, signal), [equipmentId])
  const fetchRating = useCallback((signal: AbortSignal) => equipmentService.rating(equipmentId, signal), [equipmentId])
  const { data: equipment, error, isLoading, reload } = useAsync(fetchEquipment)
  const rating = useAsync(fetchRating)

  if (isLoading) return <LoadingView label={t('equipmentDetail.loading')} />
  if (error || !equipment) return error ? <ErrorView error={error} onRetry={reload} /> : null

  const specs = parseSpecifications(equipment.specifications)
  const isOwn = equipment.ownerCompanyId === user?.companyId
  const average = rating.data?.averageRating ?? 0

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Gallery images={equipment.imageUrls} width={width} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <EquipmentStatusBadge status={equipment.status} />
            {average > 0 && (
              <Text style={styles.rating}>
                <Ionicons name="star" size={14} color={colors.brand} /> {average.toFixed(1)}
              </Text>
            )}
          </View>
          <EquipmentBadges equipment={equipment} />
          <Text style={styles.title}>{equipment.name}</Text>
          <Text style={styles.muted}>
            {equipment.brand} · {equipment.model}
            {equipment.manufactureYear ? ` · ${equipment.manufactureYear}` : ''}
          </Text>
          <Text style={styles.price}>
            {formatCurrency(equipment.dailyRate, equipment.currency)}
            <Text style={styles.muted}> {t('common.perDay')}</Text>
          </Text>

          <View style={styles.card}>
            <Info
              icon="shield-checkmark-outline"
              text={t('equipmentDetail.depositInfo', { amount: formatCurrency(equipment.securityDeposit, equipment.currency) })}
            />
            <Info icon="location-outline" text={[equipment.address, equipment.city].filter(Boolean).join(', ')} />
            <Info icon="business-outline" text={equipment.ownerCompanyName} />
            {equipment.categories.length > 0 && <Info icon="pricetags-outline" text={equipment.categories.join(' · ')} />}
          </View>

          {equipment.description && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('equipmentDetail.description')}</Text>
              <Text style={styles.text}>{equipment.description}</Text>
            </View>
          )}

          {specs.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('equipmentDetail.specifications')}</Text>
              {specs.map((spec) => (
                <Row key={spec.label} label={spec.label} value={spec.value} />
              ))}
            </View>
          )}

          <EquipmentExtras equipment={equipment} />

          {isOwn ? (
            <Text style={styles.notice}>{t('equipmentDetail.own')}</Text>
          ) : equipment.status !== 'AVAILABLE' ? (
            <Text style={styles.notice}>{t('equipmentDetail.unavailable')}</Text>
          ) : (
            <>
              <ReservationForm
                equipment={equipment}
                offer={offer}
                onBooked={() => navigation.navigate('Main', { screen: 'Reservations', params: { role: 'RENTER' } })}
              />
              {!offer && <OfferForm equipment={equipment} onSent={() => navigation.navigate('Offers', { role: 'RENTER' })} />}
            </>
          )}

          <ReviewsSection equipmentId={equipment.id} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Info({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  )
}

const useStyles = makeStyles((colors, typography) => ({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 48 },
  body: { padding: spacing.lg, gap: spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, position: 'absolute', bottom: 10, left: 0, right: 0 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)' },
  photoCredit: { ...typography.caption, fontSize: 11, paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  dotActive: { backgroundColor: colors.brand, width: 18 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rating: { fontSize: 14, fontWeight: '700', color: colors.ink },
  title: typography.title,
  price: { fontSize: 26, fontWeight: '800', color: colors.ink },
  muted: { fontSize: 14, color: colors.muted },
  text: typography.body,
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  sectionTitle: typography.heading,
  info: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  infoText: { flex: 1, fontSize: 14, color: colors.text },
  dates: { flexDirection: 'row', gap: spacing.md },
  availability: { minHeight: 20 },
  free: { color: colors.success, fontWeight: '700' },
  taken: { color: colors.danger, fontWeight: '700' },
  notes: { minHeight: 80, textAlignVertical: 'top', paddingTop: spacing.md },
  summary: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowLabel: { flex: 1, fontSize: 14, color: colors.muted },
  rowValue: { fontSize: 14, color: colors.ink, fontWeight: '600', textAlign: 'right' },
  bold: { fontWeight: '800', color: colors.ink, fontSize: 15 },
  notice: { ...typography.body, textAlign: 'center', color: colors.muted, padding: spacing.lg },
}))
