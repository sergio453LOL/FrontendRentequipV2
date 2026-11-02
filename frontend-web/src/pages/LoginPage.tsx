import { Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { AuthLayout } from '../components/layout/AuthLayout'
import type { LoginLocationState } from '../contexts/AuthContextDefinition'
import { useAuth } from '../hooks/useAuth'
import { useZodForm } from '../hooks/useZodForm'
import { PATHS } from '../routes/paths'
import i18n from '../i18n'
import { ApiError } from '../utils/apiError'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'validation.emailRequired').pipe(z.email('validation.emailInvalid')),
  password: z.string().min(1, 'validation.passwordRequired'),
})

type LoginFormValues = z.infer<typeof loginSchema>

function loginErrorMessage(error: unknown): string {
  const apiError = ApiError.from(error)
  return apiError.status === 401 ? i18n.t('login.wrongCredentials') : apiError.message
}

export default function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const location = useLocation()
  const locationState = (location.state ?? {}) as LoginLocationState
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useZodForm(loginSchema, { defaultValues: { email: '', password: '' } })

  async function onSubmit(values: LoginFormValues) {
    setFormError(null)
    try {
      await login(values)
    } catch (error) {
      setFormError(loginErrorMessage(error))
    }
  }

  return (
    <AuthLayout
      title={t('login.title')}
      description={t('login.description')}
    >

        {locationState.sessionExpired && !formError && (
          <p role="alert" className="mb-4 rounded-md border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
            {t('login.sessionExpired')}
          </p>
        )}
        {formError && (
          <p role="alert" className="mb-4 rounded-md bg-[#ffedea] px-4 py-3 text-sm text-[#831c1e]">
            {formError}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <Input
            label={t('login.email')}
            type="email"
            autoComplete="email"
            placeholder={t('login.emailPlaceholder')}
            required
            error={errors.email?.message}
            leftIcon={<Mail className="size-4" />}
            {...register('email')}
          />
          <Input
            label={t('login.password')}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            error={errors.password?.message}
            leftIcon={<Lock className="size-4" />}
            {...register('password')}
          />
          <Button type="submit" variant="gradient" size="lg" fullWidth isLoading={isSubmitting} className="h-11">
            {t('login.submit')}
          </Button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          {t('login.noAccount')}{' '}
          <Link to={PATHS.register} className="font-medium text-ink underline underline-offset-2">
            {t('login.createAccount')}
          </Link>
        </p>
    </AuthLayout>
  )
}
