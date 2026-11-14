import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'
import { useTheme } from '../hooks/useTheme'
import { radius, spacing } from '../theme'
import { makeStyles } from '../theme/makeStyles'
import type { Reservation, ReservationRole } from '../types/api'
import { formatCurrency, formatDate, formatDays } from '../utils/format'
import { PaymentStatusBadge, ReservationStatusBadge } from './Badge'

interface ReservationCardProps {
  reservation: Reservation
  role: ReservationRole
  onPress: () => void
}

export function ReservationCard({ reservation, role, onPress }: ReservationCardProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('reservations.cardLabel', { name: reservation.equipmentName })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {reservation.equipmentName}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </View>
      <View style={styles.badges}>
        <ReservationStatusBadge status={reservation.status} />
        <PaymentStatusBadge status={reservation.paymentStatus} />
      </View>
      <View style={styles.meta}>
        <Ionicons name="calendar-outline" size={14} color={colors.muted} />
        <Text style={styles.metaText}>
          {formatDate(reservation.startDate)} – {formatDate(reservation.endDate)} · {formatDays(reservation.totalDays)}
        </Text>
      </View>
      {role === 'OWNER' && (
        <View style={styles.meta}>
          <Ionicons name="business-outline" size={14} color={colors.muted} />
          <Text style={styles.metaText}>{reservation.renterCompanyName}</Text>
        </View>
      )}
      <Text style={styles.total}>{formatCurrency(reservation.totalAmount, reservation.currency)}</Text>
    </Pressable>
  )
}

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.9 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink },
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: colors.muted },
  total: { fontSize: 16, fontWeight: '800', color: colors.ink, alignSelf: 'flex-end' },
}))
