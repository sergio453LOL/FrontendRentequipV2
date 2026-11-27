import { KeyRound, Lock, Mail } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { AuthDivider, GoogleSignInButton } from '../components/auth/GoogleSignInButton'
import { DemoAccessButton } from '../components/common/DemoAccessButton'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { AuthLayout } from '../components/layout/AuthLayout'
import type { LoginLocationState } from '../contexts/AuthContextDefinition'
import type { TwoFactorChallenge } from '../types'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { IDLE_TIMEOUT_MINUTES } from '../hooks/useSessionTimeout'
import { useZodForm } from '../hooks/useZodForm'
import { PATHS } from '../routes/paths'
import i18n from '../i18n'
import { ApiError } from '../utils/apiError'
import { continueWithGoogle, isGoogleSignInEnabled } from '../utils/googleSignIn'
import { isRecaptchaEnabled, loadRecaptcha, recaptchaToken } from '../utils/recaptcha'

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
  const { login, loginWithGoogle } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const locationState = (location.state ?? {}) as LoginLocationState
  const [formError, setFormError] = useState<string | null>(null)
  /**
   * Set when the account has the two-step verification on: the password (or Google) was right and a code was
   * sent. `resend` repeats that same first step to send a new code.
   */
  const [pending, setPending] = useState<{ challenge: TwoFactorChallenge; resend: () => Promise<TwoFactorChallenge | null> } | null>(null)
  const [isGoogleBusy, setIsGoogleBusy] = useState(false)

  // reCAPTCHA v3 scores the visitor while they type, so it loads as soon as the page opens.
  useEffect(() => {
    void loadRecaptcha().catch(() => undefined)
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useZodForm(loginSchema, { defaultValues: { email: '', password: '' } })

  async function onSubmit(values: LoginFormValues) {
    setFormError(null)
    try {
      // Each attempt (and each resent code) asks for its own token: they work once and last two minutes.
      const attempt = async () => login({ ...values, recaptchaToken: await recaptchaToken('login') })
      const challenge = await attempt()
      if (challenge) setPending({ challenge, resend: attempt })
    } catch (error) {
      setFormError(loginErrorMessage(error))
    }
  }

  async function onGoogleCredential(credential: string) {
    setFormError(null)
    setIsGoogleBusy(true)
    try {
      const outcome = await continueWithGoogle(credential, loginWithGoogle)
      if (outcome.kind === 'challenge') {
        setPending({ challenge: outcome.challenge, resend: () => loginWithGoogle(credential) })
      } else if (outcome.kind === 'signup') {
        // No account has this Google email: the sign-up form takes over, pre-filled and without a password.
        navigate(PATHS.register, { state: { from: locationState.from, google: outcome.signup } })
      }
    } catch (error) {
      setFormError(ApiError.from(error).message)
    } finally {
      setIsGoogleBusy(false)
    }
  }

  if (pending) {
    return (
      <TwoFactorStep
        challenge={pending.challenge}
        onResend={async () => {
          const challenge = await pending.resend()
          if (challenge) setPending({ challenge, resend: pending.resend })
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
          <p role="alert" className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {locationState.sessionIdle ? t('login.sessionIdle', { minutes: IDLE_TIMEOUT_MINUTES }) : t('login.sessionExpired')}
          </p>
        )}
        {formError && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </p>
        )}

        {/* Visitors who only want to look around (the jury, the public) enter in one click. */}
        <div className="mb-6 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <p className="text-sm font-medium text-ink">{t('demo.loginTitle')}</p>
          <p className="mt-0.5 text-sm text-slate-600">{t('demo.loginText')}</p>
          <DemoAccessButton returnTo={locationState.from ?? PATHS.catalog} className="mt-3 w-full" />
        </div>

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

        {isGoogleSignInEnabled && (
          <>
            <AuthDivider label={t('login.orDivider')} />
            <div aria-busy={isGoogleBusy} className={isGoogleBusy ? 'pointer-events-none opacity-60' : undefined}>
              <GoogleSignInButton
                text="continue_with"
                onCredential={(credential) => void onGoogleCredential(credential)}
                onLoadError={() => setFormError(t('login.googleFailed'))}
              />
            </div>
          </>
        )}

        {isRecaptchaEnabled && (
          <p className="mt-4 text-center text-xs text-slate-500">
            {t('login.recaptchaProtected')}{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
              {t('login.recaptchaPrivacy')}
            </a>
            {' · '}
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
              {t('login.recaptchaTerms')}
            </a>
          </p>
        )}

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

/** Second step of a protected login: the six-digit code sent by email or SMS. Also used by the sign-up page. */
export function TwoFactorStep({
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
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
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
