import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native'
import { useTheme } from '../hooks/useTheme'
import { translateMessage } from '../i18n'
import { radius, spacing } from '../theme'
import { makeStyles } from '../theme/makeStyles'

interface TextFieldProps extends TextInputProps {
  label: string
  /** An i18n key from a Zod schema ("validation.emailRequired") or a backend message, shown as is. */
  error?: string
  hint?: string
  required?: boolean
  /** With `secureTextEntry`, shows an eye button that reveals what was typed. */
  revealable?: boolean
}

export function TextField({ label, error, hint, required, revealable, secureTextEntry, style, ...inputProps }: TextFieldProps) {
  const { t } = useTranslation()
  const { colors, scheme } = useTheme()
  const styles = useStyles()
  const [isRevealed, setIsRevealed] = useState(false)
  const errorText = translateMessage(error)
  const message = errorText ?? hint
  const canReveal = revealable && secureTextEntry
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <View>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          keyboardAppearance={scheme}
          secureTextEntry={secureTextEntry && !isRevealed}
          style={[styles.input, canReveal ? styles.inputWithEye : null, errorText ? styles.inputError : null, style]}
          {...inputProps}
        />
        {canReveal && (
          <Pressable
            onPress={() => setIsRevealed((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={isRevealed ? t('auth.hidePassword') : t('auth.showPassword')}
            style={styles.eye}
            hitSlop={12}
          >
            <Ionicons name={isRevealed ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {message && (
        <Text style={[styles.message, errorText ? styles.errorText : null]} accessibilityLiveRegion="polite">
          {message}
        </Text>
      )}
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  container: { gap: spacing.xs },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  required: { color: colors.danger },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  inputWithEye: { paddingRight: 44 },
  inputError: { borderColor: colors.danger },
  eye: { position: 'absolute', right: spacing.md, top: 14 },
  message: { fontSize: 12, color: colors.muted },
  errorText: { color: colors.danger },
}))
