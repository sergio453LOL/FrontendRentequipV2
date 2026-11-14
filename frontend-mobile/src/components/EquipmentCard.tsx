import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, Pressable, Text, View } from 'react-native'
import { useTheme } from '../hooks/useTheme'
import { radius, spacing } from '../theme'
import { makeStyles } from '../theme/makeStyles'
import type { EquipmentSummary } from '../types/api'
import { formatCurrency, formatDistance } from '../utils/format'
import { EquipmentStatusBadge } from './Badge'

interface EquipmentCardProps {
  equipment: EquipmentSummary
  distanceKm?: number
  onPress: () => void
}

export function EquipmentImage({ uri, height }: { uri: string | null | undefined; height: number }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const [failed, setFailed] = useState(false)
  if (!uri || failed) {
    return (
      <View style={[styles.placeholder, { height }]} accessibilityLabel={t('equipment.noPhoto')}>
        <Ionicons name="construct-outline" size={height / 3} color={colors.muted} />
      </View>
    )
  }
  return <Image source={{ uri }} style={{ height, width: '100%' }} resizeMode="cover" onError={() => setFailed(true)} />
}

export function EquipmentCard({ equipment, distanceKm, onPress }: EquipmentCardProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('equipment.cardLabel', {
        name: equipment.name,
        price: formatCurrency(equipment.dailyRate, equipment.currency),
      })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <EquipmentImage uri={equipment.primaryImageUrl} height={150} />
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {equipment.name}
          </Text>
          <EquipmentStatusBadge status={equipment.status} />
        </View>
        <Text style={styles.subtitle}>
          {equipment.brand} · {equipment.model}
        </Text>
        <View style={styles.row}>
          <View style={styles.meta}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Text style={styles.metaText}>
              {equipment.city}
              {distanceKm !== undefined ? ` · ${t('equipment.away', { distance: formatDistance(distanceKm) })}` : ''}
            </Text>
          </View>
          <Text style={styles.price}>
            {formatCurrency(equipment.dailyRate, equipment.currency)}
            <Text style={styles.perDay}> {t('common.perDay')}</Text>
          </Text>
        </View>
        <Text style={styles.owner} numberOfLines={1}>
          {equipment.ownerCompanyName}
        </Text>
      </View>
    </Pressable>
  )
}

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.9 },
  placeholder: { width: '100%', backgroundColor: colors.raised, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.lg, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 14, color: colors.muted },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  metaText: { fontSize: 13, color: colors.muted },
  price: { fontSize: 17, fontWeight: '800', color: colors.ink },
  perDay: { fontSize: 13, fontWeight: '400', color: colors.muted },
  owner: { fontSize: 12, color: colors.muted },
}))
