import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, type Path } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { z } from 'zod'
import { AppButton } from '../../components/AppButton'
import { Chip } from '../../components/Chip'
import { TextField } from '../../components/TextField'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { translateMessage } from '../../i18n'
import { radius, spacing } from '../../theme'
import { makeStyles } from '../../theme/makeStyles'
import { ApiError } from '../../utils/apiError'
import { PERU_CITIES } from '../../utils/cities'

/** Messages are i18n keys, translated where the field shows them. */
const registerSchema = z
  .object({
    companyName: z.string().trim().min(2, 'validation.min2').max(150, 'validation.max150'),
    taxId: z.string().trim().regex(/^\d{11}$/, 'validation.taxId'),
    companyEmail: z.string().trim().pipe(z.email('validation.emailInvalid')),
    city: z.string().min(1, 'validation.cityRequired'),
    firstName: z.string().trim().min(1, 'validation.firstNameRequired').max(80, 'validation.max80'),
    lastName: z.string().trim().min(1, 'validation.lastNameRequired').max(80, 'validation.max80'),
    email: z.string().trim().pipe(z.email('validation.emailInvalid')),
    password: z
      .string()
      .min(8, 'validation.passwordMin')
      .max(64, 'validation.passwordMax')
      .regex(/[a-z]/, 'validation.passwordLower')
      .regex(/[A-Z]/, 'validation.passwordUpper')
      .regex(/\d/, 'validation.passwordDigit'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'validation.passwordMismatch',
  })

type RegisterValues = z.infer<typeof registerSchema>

const SERVER_FIELDS: Record<string, Path<RegisterValues>> = {
  'company.name': 'companyName',
  'company.taxId': 'taxId',
  'company.email': 'companyEmail',
  'company.city': 'city',
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
  password: 'password',
}

type FieldName = Exclude<Path<RegisterValues>, 'city'>

interface FieldConfig {
  name: FieldName
  keyboard?: 'default' | 'email-address' | 'number-pad'
  secure?: boolean
  maxLength?: number
  /** Placeholders that are examples, not words: the same in every language. */
  placeholder?: string
}

const COMPANY_FIELDS: FieldConfig[] = [
  { name: 'companyName' },
  { name: 'taxId', placeholder: '20123456789', keyboard: 'number-pad', maxLength: 11 },
  { name: 'companyEmail', placeholder: 'contacto@empresa.com', keyboard: 'email-address' },
]

const ADMIN_FIELDS: FieldConfig[] = [
  { name: 'firstName' },
  { name: 'lastName' },
  { name: 'email', placeholder: 'tu@empresa.com', keyboard: 'email-address' },
  { name: 'password', secure: true },
  { name: 'confirmPassword', secure: true },
]

export default function RegisterScreen() {
  const { t } = useTranslation()
  const styles = useStyles()
  const { register } = useAuth()
  const toast = useToast()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: {
      companyName: '',
      taxId: '',
      companyEmail: '',
      city: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(values: RegisterValues) {
    setFormError(null)
    const city = PERU_CITIES.find((item) => item.name === values.city) ?? PERU_CITIES[0]
    try {
      await register({
        company: {
          name: values.companyName,
          taxId: values.taxId,
          email: values.companyEmail,
          city: city.name,
          latitude: city.latitude,
          longitude: city.longitude,
        },
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
      })
      toast.success(t('register.created'), t('register.welcome', { company: values.companyName }))
    } catch (error) {
      const apiError = ApiError.from(error)
      apiError.details.forEach((detail) => {
        const field = SERVER_FIELDS[detail.field]
        if (field) setError(field, { message: detail.message })
      })
      setFormError(apiError.details.length > 0 ? t('common.checkFields') : apiError.message)
    }
  }

  const renderField = (config: FieldConfig) => (
    <Controller
      key={config.name}
      control={control}
      name={config.name}
      render={({ field }) => (
        <TextField
          label={t(`register.fields.${config.name}`)}
          required
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={errors[config.name]?.message}
          placeholder={config.name === 'companyName' ? t('register.companyNamePlaceholder') : config.placeholder}
          keyboardType={config.keyboard ?? 'default'}
          autoCapitalize={config.keyboard === 'email-address' || config.secure ? 'none' : 'words'}
          secureTextEntry={config.secure}
          revealable={config.secure}
          maxLength={config.maxLength}
        />
      )}
    />
  )

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {formError && (
          <Text style={styles.formError} accessibilityRole="alert">
            {formError}
          </Text>
        )}

        <Text style={styles.section}>{t('register.companySection')}</Text>
        {COMPANY_FIELDS.map(renderField)}
        <Controller
          control={control}
          name="city"
          render={({ field }) => (
            <View style={styles.cityGroup}>
              <Text style={styles.label}>{t('register.city')} *</Text>
              <View style={styles.chips}>
                {PERU_CITIES.map((city) => (
                  <Chip key={city.name} label={city.name} selected={field.value === city.name} onPress={() => field.onChange(city.name)} />
                ))}
              </View>
              {errors.city && <Text style={styles.error}>{translateMessage(errors.city.message)}</Text>}
            </View>
          )}
        />

        <Text style={styles.section}>{t('register.adminSection')}</Text>
        {ADMIN_FIELDS.map(renderField)}
        <Text style={styles.hint}>{t('register.passwordHint')}</Text>

        <AppButton title={t('register.submit')} icon="checkmark-circle-outline" onPress={handleSubmit(onSubmit)} isLoading={isSubmitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const useStyles = makeStyles((colors, typography) => ({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 48 },
  section: { ...typography.heading, marginTop: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  cityGroup: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { fontSize: 12, color: colors.danger },
  hint: typography.caption,
  formError: {
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    padding: spacing.md,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
}))
