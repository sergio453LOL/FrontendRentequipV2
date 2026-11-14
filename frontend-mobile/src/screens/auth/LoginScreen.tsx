import { Ionicons } from '@expo/vector-icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { z } from 'zod'
import { AppButton } from '../../components/AppButton'
import { PreferencesPicker } from '../../components/PreferencesPicker'
import { TextField } from '../../components/TextField'
import { API_BASE_URL } from '../../config/env'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import type { AuthScreenProps } from '../../navigation/types'
import { radius, spacing } from '../../theme'
import { makeStyles } from '../../theme/makeStyles'
import { ApiError } from '../../utils/apiError'

/** Messages are i18n keys, translated where the field shows them. */
const loginSchema = z.object({
  email: z.string().trim().min(1, 'validation.emailRequired').pipe(z.email('validation.emailInvalid')),
  password: z.string().min(1, 'validation.passwordRequired'),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const { login } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), mode: 'onTouched', defaultValues: { email: '', password: '' } })

  async function onSubmit(values: LoginValues) {
    setFormError(null)
    try {
      await login(values)
    } catch (error) {
      const apiError = ApiError.from(error)
      setFormError(apiError.status === 401 ? t('auth.wrongCredentials') : apiError.message)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.logo}>
              <Ionicons name="construct" size={36} color={colors.onBrand} />
            </View>
            <Text style={styles.title}>RentEquip</Text>
            <Text style={styles.subtitle}>{t('auth.tagline')}</Text>
          </View>

          {formError && (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          )}

          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextField
                label={t('auth.email')}
                required
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                placeholder={t('auth.emailPlaceholder')}
                returnKeyType="next"
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <TextField
                label={t('auth.password')}
                required
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.password?.message}
                secureTextEntry
                revealable
                autoComplete="password"
                textContentType="password"
                placeholder="••••••••"
                returnKeyType="go"
                onSubmitEditing={() => void handleSubmit(onSubmit)()}
              />
            )}
          />

          <AppButton title={t('auth.signIn')} icon="log-in-outline" onPress={handleSubmit(onSubmit)} isLoading={isSubmitting} />
          <AppButton title={t('auth.registerCompany')} variant="ghost" onPress={() => navigation.navigate('Register')} />
          <PreferencesPicker />
          <Text style={styles.server}>{t('common.server', { url: API_BASE_URL })}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const useStyles = makeStyles((colors, typography) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: typography.title,
  subtitle: { ...typography.body, color: colors.muted, textAlign: 'center' },
  errorBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 14 },
  server: { ...typography.caption, textAlign: 'center', fontSize: 11 },
}))
