import { KeyRound, Lock, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { AuthLayout } from '../components/layout/AuthLayout'
import type { LoginLocationState } from '../contexts/AuthContextDefinition'
import type { LoginRequest, TwoFactorChallenge } from '../types'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { IDLE_TIMEOUT_MINUTES } from '../hooks/useSessionTimeout'
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
  /** Set when the account has the two-step verification on: the password was right and a code was sent. */
  const [pending, setPending] = useState<{ challenge: TwoFactorChallenge; credentials: LoginRequest } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useZodForm(loginSchema, { defaultValues: { email: '', password: '' } })

  async function onSubmit(values: LoginFormValues) {
    setFormError(null)
    try {
      const challenge = await login(values)
      if (challenge) setPending({ challenge, credentials: values })
    } catch (error) {
      setFormError(loginErrorMessage(error))
    }
  }

  if (pending) {
    return (
      <TwoFactorStep
        challenge={pending.challenge}
        onResend={async () => {
          const challenge = await login(pending.credentials)
          if (challenge) setPending({ challenge, credentials: pending.credentials })
        }}
        onBack={() => setPending(null)}
      />
    )
  }

  return (
    <AuthLayout
      title={t('login.title')}
      description={t('login.description')}
    >

        {(locationState.sessionExpired || locationState.sessionIdle) && !formError && (
          <p role="alert" className="mb-4 rounded-md border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
            {locationState.sessionIdle ? t('login.sessionIdle', { minutes: IDLE_TIMEOUT_MINUTES }) : t('login.sessionExpired')}
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
          {/* Carries `from` along, so a visitor who switches to signing up still lands where they were going. */}
          <Link to={PATHS.register} state={locationState.from ? { from: locationState.from } : undefined} className="font-medium text-ink underline underline-offset-2">
            {t('login.createAccount')}
          </Link>
        </p>
    </AuthLayout>
  )
}

const CODE_PATTERN = /^\d{6}$/

/** Second step of a protected login: the six-digit code sent by email or SMS. */
function TwoFactorStep({
  challenge,
  onResend,
  onBack,
}: {
  challenge: TwoFactorChallenge
  onResend: () => Promise<void>
  onBack: () => void
}) {
  const { t } = useTranslation()
  const { verifyLogin } = useAuth()
  const toast = useToast()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!CODE_PATTERN.test(code)) {
      setError(t('login.twoFactor.codeInvalid'))
      return
    }
    setError(null)
    setIsVerifying(true)
    try {
      await verifyLogin({ challengeId: challenge.challengeId, code })
    } catch (failure) {
      setError(ApiError.from(failure).message)
      setCode('')
      setIsVerifying(false)
    }
  }

  async function resend() {
    setError(null)
    setIsResending(true)
    try {
      await onResend()
      setCode('')
      toast.success(t('login.twoFactor.resent'))
    } catch (failure) {
      setError(ApiError.from(failure).message)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AuthLayout
      title={t('login.twoFactor.title')}
      description={t('login.twoFactor.sentTo', {
        channel: t(`login.twoFactor.channels.${challenge.channel}`),
        destination: challenge.destination,
        minutes: Math.round(challenge.expiresInSeconds / 60),
      })}
    >
      {error && (
        <p role="alert" className="mb-4 rounded-md bg-[#ffedea] px-4 py-3 text-sm text-[#831c1e]">
          {error}
        </p>
      )}
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Input
          label={t('login.twoFactor.code')}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          className="[&_input]:text-lg [&_input]:tracking-[0.4em] [&_input]:tabular-nums"
          leftIcon={<KeyRound className="size-4" />}
        />
        <Button type="submit" variant="gradient" size="lg" fullWidth isLoading={isVerifying} className="h-11">
          {t('login.twoFactor.submit')}
        </Button>
      </form>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <button type="button" onClick={onBack} className="font-medium text-slate-600 underline underline-offset-2 hover:text-ink">
          {t('login.twoFactor.back')}
        </button>
        <Button type="button" variant="ghost" size="sm" isLoading={isResending} onClick={() => void resend()}>
          {t('login.twoFactor.resend')}
        </Button>
      </div>
    </AuthLayout>
  )
}
