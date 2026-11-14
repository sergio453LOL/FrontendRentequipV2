import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import type { ColorScheme } from '../contexts/ThemeContext'
import { useTheme } from '../hooks/useTheme'
import type { EquipmentStatus, ReservationPaymentStatus, ReservationStatus } from '../types/api'

type Tone = 'green' | 'amber' | 'blue' | 'gray' | 'red'

const TONES: Record<ColorScheme, Record<Tone, { background: string; text: string }>> = {
  light: {
    green: { background: '#ECFDF5', text: '#047857' },
    amber: { background: '#FFFBEB', text: '#92400E' },
    blue: { background: '#F0F9FF', text: '#0369A1' },
    gray: { background: '#F1F5F9', text: '#475569' },
    red: { background: '#FEF2F2', text: '#B91C1C' },
  },
  dark: {
    green: { background: '#052E22', text: '#6EE7B7' },
    amber: { background: '#3B2A0B', text: '#FCD34D' },
    blue: { background: '#0C2333', text: '#7DD3FC' },
    gray: { background: '#1E293B', text: '#CBD5E1' },
    red: { background: '#3B1212', text: '#FCA5A5' },
  },
}

export function Badge({ label, tone }: { label: string; tone: Tone }) {
  const { scheme } = useTheme()
  const palette = TONES[scheme][tone]
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
    </View>
  )
}

const RESERVATION_TONES: Record<ReservationStatus, Tone> = {
  PENDING: 'amber',
  CONFIRMED: 'blue',
  IN_PROGRESS: 'green',
  COMPLETED: 'gray',
  CANCELLED: 'red',
  REJECTED: 'red',
}

const EQUIPMENT_TONES: Record<EquipmentStatus, Tone> = {
  AVAILABLE: 'green',
  RENTED: 'blue',
  MAINTENANCE: 'amber',
  INACTIVE: 'gray',
}

const PAYMENT_TONES: Record<ReservationPaymentStatus, Tone> = { UNPAID: 'amber', PAID: 'green', REFUNDED: 'gray' }

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const { t } = useTranslation()
  return <Badge label={t(`status.reservation.${status}`)} tone={RESERVATION_TONES[status]} />
}

export function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
  const { t } = useTranslation()
  return <Badge label={t(`status.equipment.${status}`)} tone={EQUIPMENT_TONES[status]} />
}

export function PaymentStatusBadge({ status }: { status: ReservationPaymentStatus }) {
  const { t } = useTranslation()
  return <Badge label={t(`status.payment.${status}`)} tone={PAYMENT_TONES[status]} />
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  text: { fontSize: 12, fontWeight: '700' },
})
