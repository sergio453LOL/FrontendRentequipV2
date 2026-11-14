import { Pressable, Text } from 'react-native'
import { radius, spacing } from '../theme'
import { makeStyles } from '../theme/makeStyles'

interface ChipProps {
  label: string
  selected: boolean
  onPress: () => void
}

export function Chip({ label, selected, onPress }: ChipProps) {
  const styles = useStyles()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.text, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  )
}

const useStyles = makeStyles((colors) => ({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  text: { fontSize: 14, fontWeight: '600', color: colors.text },
  selectedText: { color: colors.brandDark },
}))
