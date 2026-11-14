import { Ionicons } from '@expo/vector-icons'
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useTranslation } from 'react-i18next'
import { Platform, Pressable, Text, View } from 'react-native'
import { useTheme } from '../hooks/useTheme'
import { currentLocale, translateMessage } from '../i18n'
import { radius, spacing } from '../theme'
import { makeStyles } from '../theme/makeStyles'
import type { IsoDate } from '../types/api'
import { formatDate, toIsoDate } from '../utils/format'

interface DateFieldProps {
  label: string
  value: IsoDate | null
  onChange: (value: IsoDate) => void
  minimumDate?: Date
  error?: string
}

function parse(value: IsoDate): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Native date picker: Android opens the system dialog, iOS shows the compact inline control. */
export function DateField({ label, value, onChange, minimumDate, error }: DateFieldProps) {
  const { t } = useTranslation()
  const { colors, scheme } = useTheme()
  const styles = useStyles()
  const current = value ? parse(value) : (minimumDate ?? new Date())
  const message = translateMessage(error)

  function handleChange(event: DateTimePickerEvent, date?: Date) {
    if (event.type === 'set' && date) onChange(toIsoDate(date))
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={current}
          mode="date"
          display="compact"
          minimumDate={minimumDate}
          onChange={handleChange}
          locale={currentLocale()}
          themeVariant={scheme}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ? formatDate(value) : t('dateField.notChosen')}`}
          onPress={() => DateTimePickerAndroid.open({ value: current, mode: 'date', minimumDate, onChange: handleChange })}
          style={[styles.input, message ? styles.inputError : null]}
        >
          <Text style={value ? styles.value : styles.placeholder}>{value ? formatDate(value) : t('dateField.choose')}</Text>
          <Ionicons name="calendar-outline" size={18} color={colors.muted} />
        </Pressable>
      )}
      {message && <Text style={styles.error}>{message}</Text>}
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, gap: spacing.xs },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.danger },
  value: { fontSize: 16, color: colors.ink },
  placeholder: { fontSize: 16, color: colors.muted },
  error: { fontSize: 12, color: colors.danger },
}))
