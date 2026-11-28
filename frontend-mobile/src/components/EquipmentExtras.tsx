import { Ionicons } from '@expo/vector-icons'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, Text, View } from 'react-native'
import { useAction } from '../hooks/useAction'
import { useAsync } from '../hooks/useAsync'
import { useTheme } from '../hooks/useTheme'
import { offerService, reviewService } from '../services/rentequipApi'
import { radius, spacing } from '../theme'
import { makeStyles } from '../theme/makeStyles'
import type { Equipment, PriceOffer } from '../types/api'
import { formatCurrency, formatDate } from '../utils/format'
import { AppButton } from './AppButton'
import { Badge } from './Badge'
import { TextField } from './TextField'

/** Verified owner, operator included and for sale: what sets this listing apart, as badges. */
export function EquipmentBadges({ equipment }: { equipment: Equipment }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const badges = [
    equipment.ownerCompanyVerified && <Badge key="verified" label={t('detailExtras.verified')} tone="green" />,
    equipment.operatorIncluded && <Badge key="operator" label={t('detailExtras.operatorIncluded')} tone="blue" />,
    equipment.salePrice !== null && <Badge key="sale" label={t('detailExtras.forSale')} tone="amber" />,
  ].filter(Boolean)
  if (badges.length === 0) return null
  return <View style={styles.badges}>{badges}</View>
}

/** Video, manual, operator and sale terms: shown only when the owner filled them in. */
export function EquipmentExtras({ equipment }: { equipment: Equipment }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { operator } = equipment
  const hasLinks = Boolean(equipment.videoUrl || equipment.manualUrl)

  return (
    <>
      {hasLinks && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('detailExtras.media')}</Text>
          {equipment.videoUrl && (
            <AppButton
              title={t('detailExtras.watchVideo')}
              icon="play-circle-outline"
              variant="secondary"
              onPress={() => void Linking.openURL(equipment.videoUrl as string)}
            />
          )}
          {equipment.manualUrl && (
            <AppButton
              title={t('detailExtras.openManual')}
              icon="document-text-outline"
              variant="secondary"
              onPress={() => void Linking.openURL(equipment.manualUrl as string)}
            />
          )}
        </View>
      )}

      {equipment.operatorIncluded && operator && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('detailExtras.operatorTitle')}</Text>
          <Text style={styles.strong}>{operator.name}</Text>
          {operator.license && <Text style={styles.text}>{t('detailExtras.license', { license: operator.license })}</Text>}
          {operator.experienceYears !== null && (
            <Text style={styles.text}>{t('detailExtras.experience', { years: operator.experienceYears })}</Text>
          )}
          {operator.certifications
            ?.split(/\r?\n/)
            .filter((line) => line.trim())
            .map((line) => (
              <Text key={line} style={styles.text}>
                • {line.trim()}
              </Text>
            ))}
        </View>
      )}

      {equipment.salePrice !== null && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('detailExtras.saleTitle')}</Text>
          <Text style={styles.price}>{formatCurrency(equipment.salePrice, equipment.currency)}</Text>
          {equipment.usageHours !== null && (
            <Text style={styles.text}>{t('detailExtras.usageHours', { hours: equipment.usageHours.toLocaleString() })}</Text>
          )}
          <Text style={styles.muted}>{t('detailExtras.saleHint')}</Text>
        </View>
      )}
    </>
  )
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 2 }} accessibilityLabel={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons key={star} name={star <= value ? 'star' : 'star-outline'} size={size} color={colors.brand} />
      ))}
    </View>
  )
}

/** What earlier renters said about this machine, newest first. */
export function ReviewsSection({ equipmentId }: { equipmentId: number }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const fetchReviews = useCallback((signal: AbortSignal) => reviewService.listForEquipment(equipmentId, signal), [equipmentId])
  const reviews = useAsync(fetchReviews)
  const items = reviews.data?.content ?? []
  if (reviews.isLoading || reviews.error) return null

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>
        {t('reviews.title')} {reviews.data && reviews.data.totalElements > 0 ? `(${reviews.data.totalElements})` : ''}
      </Text>
      {items.length === 0 ? (
        <Text style={styles.muted}>{t('reviews.empty')}</Text>
      ) : (
        items.map((review) => (
          <View key={review.id} style={styles.review}>
            <View style={styles.reviewHead}>
              <Text style={styles.strong}>{review.reviewerCompanyName}</Text>
              <Stars value={review.rating} />
            </View>
            {review.comment && <Text style={styles.text}>{review.comment}</Text>}
            <Text style={styles.muted}>{formatDate(review.createdAt.slice(0, 10))}</Text>
          </View>
        ))
      )}
    </View>
  )
}

const MAX_MESSAGE = 500

/** Propose another daily rate; the owner accepts, rejects or counters it from their offers. */
export function OfferForm({ equipment, onSent }: { equipment: Equipment; onSent: (offer: PriceOffer) => void }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const [isOpen, setIsOpen] = useState(false)
  const [rate, setRate] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const { run, isRunning } = useAction()

  const value = Number(rate.replace(',', '.'))
  const rateError =
    submitted && !(value > 0)
      ? t('offers.rateRequired')
      : value >= equipment.dailyRate
        ? t('offers.rateBelowList', { rate: formatCurrency(equipment.dailyRate, equipment.currency) })
        : undefined

  async function submit() {
    setSubmitted(true)
    if (!(value > 0) || value >= equipment.dailyRate) return
    await run(() => offerService.create({ equipmentId: equipment.id, dailyRate: value, message: message.trim() || undefined }), {
      successMessage: t('offers.sent'),
      errorTitle: t('offers.sendFailed'),
      onSuccess: onSent,
    })
  }

  if (!isOpen) {
    return (
      <AppButton title={t('offers.negotiate')} icon="pricetag-outline" variant="secondary" onPress={() => setIsOpen(true)} />
    )
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('offers.formTitle')}</Text>
      <Text style={styles.muted}>{t('offers.formHint', { rate: formatCurrency(equipment.dailyRate, equipment.currency) })}</Text>
      <TextField
        label={t('offers.proposedRate')}
        required
        value={rate}
        onChangeText={(text) => setRate(text.replace(/[^\d.,]/g, ''))}
        keyboardType="decimal-pad"
        placeholder={String(Math.round(equipment.dailyRate * 0.9))}
        error={rateError}
      />
      <TextField
        label={t('offers.message')}
        value={message}
        onChangeText={setMessage}
        placeholder={t('offers.messagePlaceholder')}
        multiline
        maxLength={MAX_MESSAGE}
        style={styles.multiline}
      />
      <AppButton title={t('offers.send')} icon="send" onPress={() => void submit()} isLoading={isRunning} />
      <AppButton title={t('common.cancel')} variant="ghost" onPress={() => setIsOpen(false)} />
    </View>
  )
}

const useStyles = makeStyles((colors, typography) => ({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: typography.heading,
  text: typography.body,
  strong: { ...typography.body, fontWeight: '700', color: colors.ink },
  muted: { fontSize: 13, color: colors.muted },
  price: { fontSize: 22, fontWeight: '800', color: colors.ink },
  review: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  multiline: { minHeight: 70, textAlignVertical: 'top', paddingTop: spacing.md },
}))

export { Stars }
