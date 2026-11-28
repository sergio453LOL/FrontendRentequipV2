import { Ionicons } from '@expo/vector-icons'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'
import { useAction } from '../hooks/useAction'
import { useAsync } from '../hooks/useAsync'
import { useTheme } from '../hooks/useTheme'
import { reviewService } from '../services/rentequipApi'
import { radius, spacing } from '../theme'
import { makeStyles } from '../theme/makeStyles'
import { AppButton } from './AppButton'
import { Stars } from './EquipmentExtras'
import { TextField } from './TextField'

const MAX_COMMENT = 1000

function StarPicker({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) {
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <View style={styles.picker}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stars} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min: 1, max: 5, now: value }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable key={star} onPress={() => onChange(star)} hitSlop={6} accessibilityLabel={`${star}`}>
            <Ionicons name={star <= value ? 'star' : 'star-outline'} size={30} color={colors.brand} />
          </Pressable>
        ))}
      </View>
    </View>
  )
}

/** After a completed rental the renter rates the machine; once sent, the review is shown instead. */
export function ReviewForm({ reservationId }: { reservationId: number }) {
  const { t } = useTranslation()
  const styles = useStyles()
  const fetchReview = useCallback((signal: AbortSignal) => reviewService.findByReservation(reservationId, signal), [reservationId])
  const existing = useAsync(fetchReview)
  const [rating, setRating] = useState(0)
  const [condition, setCondition] = useState(0)
  const [comment, setComment] = useState('')
  const { run, isRunning } = useAction()

  if (existing.isLoading || existing.error) return null

  if (existing.data) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{t('reviews.yours')}</Text>
        <Stars value={existing.data.rating} size={18} />
        {existing.data.comment && <Text style={styles.text}>{existing.data.comment}</Text>}
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('reviews.formTitle')}</Text>
      <Text style={styles.muted}>{t('reviews.formHint')}</Text>
      <StarPicker label={t('reviews.overall')} value={rating} onChange={setRating} />
      <StarPicker label={t('reviews.condition')} value={condition} onChange={setCondition} />
      <TextField
        label={t('reviews.comment')}
        value={comment}
        onChangeText={setComment}
        placeholder={t('reviews.commentPlaceholder')}
        multiline
        maxLength={MAX_COMMENT}
        style={styles.multiline}
      />
      <AppButton
        title={t('reviews.send')}
        icon="star"
        disabled={rating === 0}
        isLoading={isRunning}
        onPress={() =>
          void run(
            () =>
              reviewService.create({
                reservationId,
                rating,
                conditionRating: condition || undefined,
                comment: comment.trim() || undefined,
              }),
            { successMessage: t('reviews.sent'), errorTitle: t('reviews.sendFailed'), onSuccess: existing.reload },
          )
        }
      />
    </View>
  )
}

const useStyles = makeStyles((colors, typography) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: typography.heading,
  text: typography.body,
  muted: { fontSize: 13, color: colors.muted },
  picker: { gap: spacing.xs },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  stars: { flexDirection: 'row', gap: spacing.sm },
  multiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: spacing.md },
}))
