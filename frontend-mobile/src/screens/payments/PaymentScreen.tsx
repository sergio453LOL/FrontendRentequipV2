import { Ionicons } from '@expo/vector-icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { z } from 'zod'
import { AppButton } from '../../components/AppButton'
import { Chip } from '../../components/Chip'
import { ReceiptShareButtons } from '../../components/ReceiptShareButtons'
import { ErrorView, LoadingView } from '../../components/StateViews'
import { TextField } from '../../components/TextField'
import { useAsync } from '../../hooks/useAsync'
import { useTheme } from '../../hooks/useTheme'
import type { RootScreenProps } from '../../navigation/types'
import { paymentService, reservationService } from '../../services/rentequipApi'
import { radius, spacing } from '../../theme'
import { makeStyles } from '../../theme/makeStyles'
import type { Payment } from '../../types/api'
import { ApiError } from '../../utils/apiError'
import {
  createCardToken,
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  isValidExpiry,
  passesLuhn,
  TEST_CARDS,
} from '../../utils/cardTokenizer'
import { formatCurrency } from '../../utils/format'

/** Messages are i18n keys, translated where the field shows them. */
const cardSchema = z.object({
  holderName: z.string().trim().min(3, 'validation.holderName'),
  number: z.string().refine(passesLuhn, 'validation.cardNumber'),
  expiry: z.string().refine((value) => isValidExpiry(value), 'validation.cardExpiry'),
  cvc: z.string().regex(/^\d{3,4}$/, 'validation.cardCvc'),
})

type CardValues = z.infer<typeof cardSchema>

const BRAND_ICONS = { visa: 'card', mastercard: 'card', amex: 'card', unknown: 'card-outline' } as const

/**
 * Checkout of a reservation: charges the rental and holds the refundable deposit on the card. The card is
 * turned into a Stripe test token on the phone, so the number never reaches our backend.
 */
export default function PaymentScreen({ route, navigation }: RootScreenProps<'Payment'>) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const { reservationId } = route.params
  const fetchReservation = useCallback((signal: AbortSignal) => reservationService.findById(reservationId, signal), [reservationId])
  const reservation = useAsync(fetchReservation)
  const [payments, setPayments] = useState<Payment[] | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CardValues>({
    resolver: zodResolver(cardSchema),
    mode: 'onTouched',
    defaultValues: { holderName: '', number: '', expiry: '', cvc: '' },
  })
  const cardNumber = useWatch({ control, name: 'number' })
  const brand = detectCardBrand(cardNumber)

  if (reservation.isLoading) return <LoadingView label={t('payment.preparing')} />
  if (reservation.error || !reservation.data) {
    return reservation.error ? <ErrorView error={reservation.error} onRetry={reservation.reload} /> : null
  }
  const data = reservation.data
  const money = (amount: number) => formatCurrency(amount, data.currency)

  async function onSubmit(values: CardValues) {
    setFormError(null)
    try {
      const token = await createCardToken(values)
      setPayments(await paymentService.pay(data.id, token))
    } catch (error) {
      setFormError(ApiError.from(error).message)
    }
  }

  if (payments) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.card, styles.center]}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={36} color={colors.success} />
          </View>
          <Text style={styles.title}>{t('payment.success')}</Text>
          <Text style={[styles.caption, styles.centerText]}>
            {t('payment.successDetail', { rental: money(data.rentalAmount), deposit: money(data.securityDeposit) })}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('payment.getReceipt')}</Text>
          <ReceiptShareButtons reservationId={data.id} />
        </View>
        <AppButton title={t('payment.backToReservation')} icon="arrow-back" onPress={() => navigation.goBack()} />
      </ScrollView>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.caption}>{t('reservationDetail.code', { id: data.id })}</Text>
          <Text style={styles.sectionTitle}>{data.equipmentName}</Text>
          <Amount label={t('payment.rentalNow')} value={money(data.rentalAmount)} />
          <Amount label={t('payment.depositHeld')} value={money(data.securityDeposit)} />
          <Amount label={t('payment.total')} value={money(data.totalAmount)} bold />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('payment.card')}</Text>
          <Text style={styles.caption}>{t('payment.testMode')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {TEST_CARDS.map((card) => (
              <Chip
                key={card.number}
                label={t(`payment.cards.${card.label}`)}
                selected={cardNumber === card.number}
                onPress={() => {
                  setValue('number', card.number, { shouldValidate: true })
                  setValue('expiry', '12/30', { shouldValidate: true })
                  setValue('cvc', '123', { shouldValidate: true })
                }}
              />
            ))}
          </ScrollView>

          {formError && (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          )}

          <Controller
            control={control}
            name="holderName"
            render={({ field }) => (
              <TextField
                label={t('payment.holderName')}
                required
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.holderName?.message}
                autoCapitalize="characters"
                autoComplete="name"
              />
            )}
          />
          <Controller
            control={control}
            name="number"
            render={({ field }) => (
              <View>
                <TextField
                  label={t('payment.cardNumber')}
                  required
                  value={field.value}
                  onChangeText={(text) => field.onChange(formatCardNumber(text))}
                  onBlur={field.onBlur}
                  error={errors.number?.message}
                  keyboardType="number-pad"
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                />
                <Ionicons name={BRAND_ICONS[brand]} size={20} color={colors.muted} style={styles.brandIcon} />
              </View>
            )}
          />
          <View style={styles.row}>
            <Controller
              control={control}
              name="expiry"
              render={({ field }) => (
                <View style={styles.flex}>
                  <TextField
                    label={t('payment.expiry')}
                    required
                    value={field.value}
                    onChangeText={(text) => field.onChange(formatExpiry(text))}
                    onBlur={field.onBlur}
                    error={errors.expiry?.message}
                    keyboardType="number-pad"
                    placeholder={t('payment.expiryPlaceholder')}
                    maxLength={5}
                  />
                </View>
              )}
            />
            <Controller
              control={control}
              name="cvc"
              render={({ field }) => (
                <View style={styles.flex}>
                  <TextField
                    label="CVC"
                    required
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.cvc?.message}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={4}
                  />
                </View>
              )}
            />
          </View>
        </View>

        <AppButton
          title={t('payment.pay', { amount: money(data.totalAmount) })}
          icon="lock-closed-outline"
          onPress={handleSubmit(onSubmit)}
          isLoading={isSubmitting}
        />
        <Text style={[styles.caption, styles.centerText]}>{t('payment.notStored')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 48 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  center: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
  title: typography.title,
  sectionTitle: typography.heading,
  caption: typography.caption,
  chips: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  brandIcon: { position: 'absolute', right: spacing.md, top: 38 },
  amount: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  amountLabel: { flex: 1, fontSize: 14, color: colors.muted },
  amountValue: { fontSize: 14, color: colors.ink, fontWeight: '600' },
  bold: { fontWeight: '800', color: colors.ink, fontSize: 16 },
  successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: spacing.md },
  errorText: { flex: 1, color: colors.danger, fontSize: 14 },
}))
