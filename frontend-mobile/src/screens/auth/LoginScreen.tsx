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
import { useToast } from '../../hooks/useToast'
import { useTheme } from '../../hooks/useTheme'
import type { AuthScreenProps } from '../../navigation/types'
import type { LoginRequest, TwoFactorChallenge } from '../../types/api'
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
  const { login, verifyLogin, loginDemo } = useAuth()
  const [isOpeningDemo, setIsOpeningDemo] = useState(false)
  const toast = useToast()
  const [formError, setFormError] = useState<string | null>(null)
  /** Set when the account has the two-step verification on: the password was right and a code was sent. */
  const [pending, setPending] = useState<{
    challenge: TwoFactorChallenge
    credentials: LoginRequest
  } | null>(null)
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginValues) {
    setFormError(null)
    try {
      const challenge = await login(values)
      if (challenge) {
        setCode('')
        setPending({ challenge, credentials: values })
      }
    } catch (error) {
      const apiError = ApiError.from(error)
      setFormError(apiError.status === 401 ? t('auth.wrongCredentials') : apiError.message)
    }
  }

  async function onDemo() {
    setFormError(null)
    setIsOpeningDemo(true)
    try {
      await loginDemo()
    } catch (error) {
      setFormError(`${t('demo.failed')}: ${ApiError.from(error).message}`)
      setIsOpeningDemo(false)
    }
  }

  async function onVerify() {
    if (!pending) return
    if (!/^\d{6}$/.test(code)) {
      setFormError(t('auth.twoFactorCodeInvalid'))
      return
    }
    setFormError(null)
    setIsVerifying(true)
    try {
      await verifyLogin({ challengeId: pending.challenge.challengeId, code })
    } catch (error) {
      setFormError(ApiError.from(error).message)
      setCode('')
      setIsVerifying(false)
    }
  }

  async function onResend() {
    if (!pending) return
    setFormError(null)
    setIsResending(true)
    try {
      const challenge = await login(pending.credentials)
      if (challenge) setPending({ challenge, credentials: pending.credentials })
      setCode('')
      toast.success(t('auth.twoFactorResent'))
    } catch (error) {
      setFormError(ApiError.from(error).message)
    } finally {
      setIsResending(false)
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

          {pending ? (
            <>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>{t('auth.twoFactorTitle')}</Text>
                <Text style={styles.subtitle}>
                  {t('auth.twoFactorSentTo', {
                    channel: t(`auth.twoFactorChannels.${pending.challenge.channel}`),
                    destination: pending.challenge.destination,
                  })}
                </Text>
              </View>
              <TextField
                label={t('auth.twoFactorCode')}
                required
                value={code}
                onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                autoFocus
                placeholder="000000"
                style={styles.codeInput}
                returnKeyType="go"
                onSubmitEditing={() => void onVerify()}
              />
              <AppButton
                title={t('auth.twoFactorSubmit')}
                icon="shield-checkmark-outline"
                onPress={() => void onVerify()}
                isLoading={isVerifying}
              />
              <AppButton
                title={t('auth.twoFactorResend')}
                variant="secondary"
                onPress={() => void onResend()}
                isLoading={isResending}
                disabled={isVerifying}
              />
              <AppButton
                title={t('auth.twoFactorBack')}
                variant="ghost"
                onPress={() => {
                  setPending(null)
                  setFormError(null)
                }}
              />
            </>
          ) : (
            <>
              <View style={styles.demoCard}>
                <Text style={styles.demoTitle}>{t('demo.loginTitle')}</Text>
                <Text style={styles.demoText}>{t('demo.loginText')}</Text>
                <AppButton title={t('demo.cta')} icon="flask-outline" onPress={() => void onDemo()} isLoading={isOpeningDemo} disabled={isSubmitting} />
              </View>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('demo.orSignIn')}</Text>
                <View style={styles.dividerLine} />
              </View>
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
            </>
          )}
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
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
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
  stepHeader: { gap: spacing.xs },
  stepTitle: { ...typography.heading, textAlign: 'center' },
  codeInput: { fontSize: 22, letterSpacing: 8, textAlign: 'center' },
  server: { ...typography.caption, textAlign: 'center', fontSize: 11 },
  demoCard: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  demoTitle: { ...typography.heading, fontSize: 16 },
  demoText: { ...typography.body, color: colors.text },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...typography.caption },
}))
