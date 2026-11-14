import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'
import type { ThemePreference } from '../contexts/ThemeContext'
import { useTheme } from '../hooks/useTheme'
import { changeLanguage, currentLanguage, LANGUAGES, type Language } from '../i18n'
import { radius, spacing } from '../theme'
import { makeStyles } from '../theme/makeStyles'

/** Each language is written in itself, so anyone can find theirs whatever the current language is. */
const LANGUAGE_NAMES: Record<Language, string> = { es: 'Español', en: 'English', zh: '中文' }

const THEMES: { value: ThemePreference; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'system', icon: 'phone-portrait-outline' },
  { value: 'light', icon: 'sunny-outline' },
  { value: 'dark', icon: 'moon-outline' },
]

/** Language and light/dark theme, saved on the phone. Shown on the login screen and in the profile. */
export function PreferencesPicker() {
  const { t } = useTranslation()
  const { colors, preference, setPreference } = useTheme()
  const styles = useStyles()
  const language = currentLanguage()

  return (
    <View style={styles.container}>
      <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={t('preferences.language')}>
        {LANGUAGES.map((option) => (
          <Segment
            key={option}
            label={LANGUAGE_NAMES[option]}
            selected={language === option}
            onPress={() => changeLanguage(option)}
          />
        ))}
      </View>
      <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={t('preferences.theme')}>
        {THEMES.map((option) => (
          <Segment
            key={option.value}
            label={t(`preferences.themes.${option.value}`)}
            icon={option.icon}
            iconColor={preference === option.value ? colors.ink : colors.muted}
            selected={preference === option.value}
            onPress={() => setPreference(option.value)}
          />
        ))}
      </View>
    </View>
  )
}

interface SegmentProps {
  label: string
  selected: boolean
  onPress: () => void
  icon?: keyof typeof Ionicons.glyphMap
  iconColor?: string
}

function Segment({ label, selected, onPress, icon, iconColor }: SegmentProps) {
  const styles = useStyles()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.segment, selected && styles.segmentActive]}
    >
      {icon && <Ionicons name={icon} size={15} color={iconColor} />}
      <Text style={[styles.segmentText, selected && styles.segmentTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}

const useStyles = makeStyles((colors) => ({
  container: { gap: spacing.sm },
  group: { flexDirection: 'row', backgroundColor: colors.raised, borderRadius: radius.md, padding: 4 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  segmentTextActive: { color: colors.ink },
}))
