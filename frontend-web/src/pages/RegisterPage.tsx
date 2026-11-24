import { ArrowLeft, ArrowRight, BadgeCheck, Building2, Check, IdCard, LocateFixed, Lock, UserRound, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Path } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import type { LoginLocationState } from '../contexts/AuthContextDefinition'
import { z } from 'zod'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { Select } from '../components/common/Select'
import { AuthLayout } from '../components/layout/AuthLayout'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { useZodForm } from '../hooks/useZodForm'
import { PATHS } from '../routes/paths'
import { ApiError } from '../utils/apiError'
import { findCity, PERU_CITIES } from '../utils/cities'
import { cn } from '../utils/cn'
import { applyServerFieldErrors } from '../utils/formErrors'
import { PASSWORD_RULES } from '../utils/passwordRules'
import { identityService, type RucInfo } from '../services/identityService'
import { isValidRuc } from '../utils/ruc'

const optionalPhone = z.string().trim().max(20, 'validation.max20').regex(/^[\d\s+()-]*$/, 'validation.phoneChars')

const registerSchema = z
  .object({
    companyName: z.string().trim().min(2, 'validation.min2').max(150, 'validation.max150'),
    taxId: z.string().trim().regex(/^\d{11}$/, 'validation.taxId').refine(isValidRuc, 'validation.rucCheck'),
    dni: z.string().trim().regex(/^(\d{8})?$/, 'validation.dni'),
    companyEmail: z.string().trim().pipe(z.email('validation.emailInvalid')),
    companyPhone: optionalPhone,
    city: z.string().min(1, 'validation.cityRequired'),
    address: z.string().trim().max(255, 'validation.max255'),
    latitude: z.string(),
    longitude: z.string(),
    firstName: z.string().trim().min(1, 'validation.firstNameRequired').max(80, 'validation.max80'),
    lastName: z.string().trim().min(1, 'validation.lastNameRequired').max(80, 'validation.max80'),
    email: z.string().trim().pipe(z.email('validation.emailInvalid')),
    phone: optionalPhone,
    password: z
      .string()
      .refine((value) => PASSWORD_RULES.every((rule) => rule.test(value)), 'validation.passwordRules'),
    confirmPassword: z.string().min(1, 'validation.confirmRequired'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'validation.passwordMismatch',
  })

type RegisterFormValues = z.infer<typeof registerSchema>

/**
 * Who is signing up decides the RUC: a company (persona jurídica) has a RUC 20; a person with a business
 * (persona natural con negocio) has a RUC 10, whose digits 3 to 10 are their DNI.
 */
type AccountType = 'COMPANY' | 'PERSON'
const ACCOUNT_TYPES: AccountType[] = ['COMPANY', 'PERSON']
const RUC_PREFIX: Record<AccountType, string> = { COMPANY: '20', PERSON: '10' }

/** Only a complete RUC is judged, so typing the first digits never shows an error. */
function rucPrefixError(ruc: string, type: AccountType | null): string | undefined {
  const value = ruc.trim()
  if (!type || !/^\d{11}$/.test(value) || value.startsWith(RUC_PREFIX[type])) return undefined
  return type === 'COMPANY' ? 'validation.ruc20' : 'validation.ruc10'
}

const STEPS = [
  {
    title: 'type',
    icon: IdCard,
    fields: [],
  },
  {
    title: 'company',
    icon: Building2,
    fields: ['taxId', 'companyPhone', 'companyName', 'companyEmail', 'city', 'address'],
  },
  {
    title: 'admin',
    icon: UserRound,
    fields: ['firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword'],
  },
] as const satisfies ReadonlyArray<{ title: string; icon: LucideIcon; fields: ReadonlyArray<Path<RegisterFormValues>> }>

/** The backend validates the nested `company` object; its field paths map to the flat form. */
const SERVER_FIELD_MAP: Partial<Record<string, Path<RegisterFormValues>>> = {
  'company.name': 'companyName',
  'company.taxId': 'taxId',
  'company.email': 'companyEmail',
  'company.phone': 'companyPhone',
  'company.city': 'city',
  'company.address': 'address',
  'company.latitude': 'city',
  'company.longitude': 'city',
}

type LocationStatus = 'idle' | 'locating' | 'detected' | 'denied' | 'unsupported'

export default function RegisterPage() {
  const { t } = useTranslation()
  // Where the visitor was going (for example the AI advisor with their question); kept if they switch to login.
  const returnTo = (useLocation().state as LoginLocationState | null)?.from
  const { register: registerAccount } = useAuth()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [formError, setFormError] = useState<string | null>(null)
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle')
  const [accountType, setAccountType] = useState<AccountType | null>(null)
  const [typeMissing, setTypeMissing] = useState(false)
  const isPerson = accountType === 'PERSON'

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    setError,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useZodForm(registerSchema, {
    defaultValues: {
      companyName: '',
      taxId: '',
      companyEmail: '',
      companyPhone: '',
      city: '',
      address: '',
      latitude: '',
      longitude: '',
      dni: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  const password = watch('password')
  const taxIdValue = watch('taxId')
  const dniValue = watch('dni')
  const [rucLookup, setRucLookup] = useState<{ ruc: string; state: 'loading' | 'found' | 'missing' | 'skipped'; info?: RucInfo } | null>(null)
  const [dniLookup, setDniLookup] = useState<'loading' | 'found' | 'missing' | 'skipped' | null>(null)
  // Fields filled from SUNAT (for this RUC) or RENIEC (for this DNI) are read-only until the number changes.
  const [sunatFilled, setSunatFilled] = useState<{ ruc: string; name: boolean; address: boolean; city: boolean } | null>(null)
  const [reniecFilled, setReniecFilled] = useState<{ dni: string; firstName: boolean; lastName: boolean } | null>(null)
  const sunatLock = sunatFilled?.ruc === taxIdValue.trim() ? sunatFilled : null
  const reniecLock = reniecFilled?.dni === dniValue.trim() ? reniecFilled : null

  // A complete, well-formed RUC of the chosen type is looked up in SUNAT once; what SUNAT returns fills in
  // and locks. A RUC 10 also carries the person's DNI, so RENIEC fills in their names even if SUNAT is down.
  useEffect(() => {
    const ruc = taxIdValue.trim()
    if (!isValidRuc(ruc) || rucPrefixError(ruc, accountType) || rucLookup?.ruc === ruc) return
    if (accountType === 'PERSON') {
      const dni = ruc.slice(2, 10)
      setValue('dni', dni, { shouldValidate: true })
      void lookupDni(dni)
    }
    setRucLookup({ ruc, state: 'loading' })
    identityService
      .ruc(ruc)
      .then((info) => {
        if (getValues('taxId').trim() !== ruc) return
        setRucLookup({ ruc, state: 'found', info })
        fillFromSunat(ruc, info)
      })
      .catch((error: unknown) => {
        const status = ApiError.from(error).status
        // 503: SUNAT lookups are not configured on this server; the check digit is all we can do.
        setRucLookup({ ruc, state: status === 404 ? 'missing' : 'skipped' })
      })
  }, [taxIdValue, accountType, rucLookup?.ruc, getValues, setValue])

  /**
   * SUNAT's data is the legal record, so it replaces whatever was typed and stays read-only: business
   * name, fiscal address and the catalogue city of its province.
   */
  function fillFromSunat(ruc: string, info: RucInfo) {
    const filled = { ruc, name: false, address: false, city: false }
    if (info.name) {
      setValue('companyName', info.name.slice(0, 150), { shouldValidate: true })
      filled.name = true
    }
    if (info.address) {
      // apisperu already ends the address with the district; the free API does not.
      const street = info.address.trim()
      const hasDistrict = info.district && street.toUpperCase().includes(info.district.toUpperCase())
      const address = hasDistrict ? street : [street, info.district].filter(Boolean).join(', ')
      setValue('address', address.slice(0, 255), { shouldValidate: true })
      filled.address = true
    }
    const city = cityFromSunat(info)
    if (city) {
      setValue('city', city.name, { shouldValidate: true })
      setValue('latitude', city.latitude.toFixed(7))
      setValue('longitude', city.longitude.toFixed(7))
      filled.city = true
    }
    setSunatFilled(filled)
  }

  /** A different RUC drops what the previous one filled in, so the old company's data is not kept by mistake. */
  function releaseSunat(newRuc: string) {
    if (!sunatFilled || sunatFilled.ruc === newRuc.trim()) return
    if (sunatFilled.name) setValue('companyName', '')
    if (sunatFilled.address) setValue('address', '')
    if (sunatFilled.city) {
      setValue('city', '')
      setValue('latitude', '')
      setValue('longitude', '')
    }
    setSunatFilled(null)
  }

  async function lookupDni(dni = getValues('dni').trim()) {
    if (!/^\d{8}$/.test(dni) || reniecFilled?.dni === dni) return
    setDniLookup('loading')
    try {
      const info = await identityService.dni(dni)
      if (getValues('dni').trim() !== dni) return
      if (info.firstNames) setValue('firstName', capitalize(info.firstNames), { shouldValidate: true })
      if (info.lastNames) setValue('lastName', capitalize(info.lastNames), { shouldValidate: true })
      setReniecFilled({ dni, firstName: Boolean(info.firstNames), lastName: Boolean(info.lastNames) })
      setDniLookup('found')
    } catch (error) {
      setDniLookup(ApiError.from(error).status === 404 ? 'missing' : 'skipped')
    }
  }

  function releaseReniec(newDni: string) {
    if (!reniecFilled || reniecFilled.dni === newDni.trim()) return
    if (reniecFilled.firstName) setValue('firstName', '')
    if (reniecFilled.lastName) setValue('lastName', '')
    setReniecFilled(null)
    setDniLookup(null)
  }
  const cityField = register('city')

  /**
   * Switching between company and person starts the RUC over: a RUC 20 is never valid for a person, and
   * everything SUNAT and RENIEC filled in belonged to the previous number.
   */
  function chooseType(type: AccountType) {
    setTypeMissing(false)
    if (type === accountType) return
    setAccountType(type)
    releaseSunat('')
    releaseReniec('')
    setValue('taxId', '')
    setValue('dni', '')
    setRucLookup(null)
  }

  async function goToNextStep() {
    if (step === 0) {
      if (accountType) setStep(1)
      else setTypeMissing(true)
      return
    }
    const isStepValid = await trigger([...STEPS[step].fields])
    if (!isStepValid) return
    const prefixError = rucPrefixError(getValues('taxId'), accountType)
    if (prefixError) {
      setError('taxId', { message: prefixError })
      return
    }
    setStep(step + 1)
  }

  function detectLocation() {
    if (!('geolocation' in navigator)) {
      setLocationStatus('unsupported')
      return
    }
    setLocationStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', position.coords.latitude.toFixed(7))
        setValue('longitude', position.coords.longitude.toFixed(7))
        setLocationStatus('detected')
      },
      () => setLocationStatus('denied'),
      { timeout: 10_000 },
    )
  }

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null)
    const city = findCity(values.city)
    const latitude = values.latitude ? Number(values.latitude) : city?.latitude
    const longitude = values.longitude ? Number(values.longitude) : city?.longitude
    if (latitude === undefined || longitude === undefined) {
      setStep(1)
      setError('city', { message: 'validation.cityInvalid' })
      return
    }

    try {
      await registerAccount({
        company: {
          name: values.companyName,
          taxId: values.taxId,
          email: values.companyEmail,
          phone: values.companyPhone || undefined,
          address: values.address || undefined,
          city: values.city,
          latitude,
          longitude,
        },
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone || undefined,
        password: values.password,
      })
      toast.success(t('register.welcomeTitle'), t('register.welcomeText', { company: values.companyName }))
    } catch (error) {
      const appliedToFields = applyServerFieldErrors(error, setError, SERVER_FIELD_MAP)
      const companyFieldFailed = ApiError.from(error).details.some((detail) => detail.field.startsWith('company.'))
      if (companyFieldFailed) setStep(1)
      setFormError(appliedToFields ? t('register.checkFields') : ApiError.from(error).message)
    }
  }

  return (
    <AuthLayout
      width="wide"
      title={t('register.title')}
      description={t('register.description')}
    >

        <ol className="mb-8 flex items-center gap-3" aria-label={t('register.progress')}>
          {STEPS.map(({ title, icon: Icon }, index) => {
            const isDone = index < step
            const isCurrent = index === step
            return (
              <li key={title} className="flex flex-1 items-center gap-3" aria-current={isCurrent ? 'step' : undefined}>
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                    isDone && 'bg-slate-700 text-white',
                    isCurrent && 'bg-ink text-white',
                    !isDone && !isCurrent && 'bg-active text-slate-600',
                  )}
                >
                  {isDone ? <Check className="size-4" /> : <Icon className="size-4" />}
                </span>
                {/* Three labels do not fit a phone: only the current one is shown there, all are read aloud. */}
                <span className={cn('text-sm font-medium', isCurrent ? 'text-slate-900' : 'text-slate-500 max-sm:sr-only')}>
                  <span className="sr-only">{t('register.stepN', { n: index + 1 })}</span>
                  {t(isPerson && title !== 'type' ? `register.stepsPerson.${title}` : `register.steps.${title}`)}
                </span>
                {index < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />}
              </li>
            )
          })}
        </ol>

        {formError && (
          <p role="alert" className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </p>
        )}

        <form
          noValidate
          onSubmit={
            step < STEPS.length - 1
              ? (event) => {
                  event.preventDefault()
                  void goToNextStep()
                }
              : handleSubmit(onSubmit)
          }
        >
          {/* A form control, not a card row: two radios with their explanation, the whole option clickable. */}
          <fieldset className={cn('grid gap-3', step !== 0 && 'hidden')} aria-describedby={typeMissing ? 'account-type-error' : undefined}>
            <legend className="mb-4 text-base font-semibold text-slate-900">{t('register.typeLegend')}</legend>
            {ACCOUNT_TYPES.map((type) => {
              const isChosen = accountType === type
              return (
                <label
                  key={type}
                  className={cn(
                    'flex cursor-pointer items-start gap-4 rounded-lg border-2 px-5 py-4 transition-colors',
                    'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-slate-300',
                    isChosen ? 'border-ink bg-raised' : 'border-slate-200 hover:border-slate-400',
                  )}
                >
                  <input
                    type="radio"
                    name="accountType"
                    value={type}
                    checked={isChosen}
                    onChange={() => chooseType(type)}
                    className="mt-1 size-4 shrink-0 accent-ink"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="text-base font-semibold text-slate-900">{t(`register.types.${type}.title`)}</span>
                      <span className="num text-sm font-semibold text-slate-600">{t(`register.types.${type}.ruc`)}</span>
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-slate-600">{t(`register.types.${type}.text`)}</span>
                  </span>
                </label>
              )
            })}
            {typeMissing && (
              <p id="account-type-error" role="alert" className="text-sm text-red-600">
                {t('register.typeRequired')}
              </p>
            )}
          </fieldset>

          <fieldset className={cn('grid gap-5 sm:grid-cols-2', step !== 1 && 'hidden')}>
            <legend className="sr-only">{t(isPerson ? 'register.personLegend' : 'register.companyLegend')}</legend>
            {/* The RUC goes first: SUNAT fills and locks the name, city and address below it. */}
            <div>
              <Input
                label={t('register.taxId')}
                required
                inputMode="numeric"
                maxLength={11}
                placeholder={isPerson ? '10467793549' : '20123456789'}
                hint={rucLookup?.ruc === taxIdValue.trim() ? undefined : t(isPerson ? 'register.taxIdHintPerson' : 'register.taxIdHintCompany')}
                error={errors.taxId?.message ?? rucPrefixError(taxIdValue, accountType)}
                {...register('taxId', { onChange: (event) => releaseSunat(event.target.value) })}
              />
              {rucLookup?.ruc === taxIdValue.trim() && (
                <p className={cn('mt-1.5 flex items-start gap-1.5 text-xs', rucLookup.state === 'found' ? 'text-positive' : 'text-slate-600')} role="status">
                  {rucLookup.state === 'loading' && t('verification.checking')}
                  {rucLookup.state === 'found' && rucLookup.info && (
                    <>
                      <BadgeCheck className="size-4 shrink-0" aria-hidden="true" />
                      {t('verification.sunatFound', {
                        type: t(`verification.rucType.${rucLookup.info.type}`),
                        state: [rucLookup.info.state, rucLookup.info.condition].filter(Boolean).join(' / '),
                      })}
                    </>
                  )}
                  {rucLookup.state === 'missing' && t('verification.sunatMissing')}
                  {rucLookup.state === 'skipped' && t('verification.formatOk')}
                </p>
              )}
            </div>
            <Input label={t(isPerson ? 'register.personPhone' : 'register.companyPhone')} type="tel" autoComplete="tel" placeholder="987 654 321" error={errors.companyPhone?.message} {...register('companyPhone')} />
            <Input
              className="sm:col-span-2"
              label={t(isPerson ? 'register.personName' : 'register.companyName')}
              required
              placeholder={t(isPerson ? 'register.personNamePlaceholder' : 'register.companyNamePlaceholder')}
              readOnly={Boolean(sunatLock?.name)}
              leftIcon={sunatLock?.name ? <Lock className="size-4" /> : undefined}
              hint={sunatLock?.name ? t('verification.lockedSunat') : undefined}
              error={errors.companyName?.message}
              {...register('companyName')}
            />
            <Input className="sm:col-span-2" label={t(isPerson ? 'register.personEmail' : 'register.companyEmail')} type="email" required placeholder={t('register.companyEmailPlaceholder')} error={errors.companyEmail?.message} {...register('companyEmail')} />
            {sunatLock?.city ? (
              // A <select> cannot be read-only, so the city SUNAT gave is shown in a locked text field.
              <Input
                label={t('register.city')}
                required
                readOnly
                value={watch('city')}
                leftIcon={<Lock className="size-4" />}
                hint={t('verification.lockedSunat')}
              />
            ) : (
              <Select
                label={t('register.city')}
                required
                placeholder={t('register.cityPlaceholder')}
                options={PERU_CITIES.map((city) => ({ value: city.name, label: city.name }))}
                error={errors.city?.message}
                {...cityField}
                onChange={(event) => {
                  void cityField.onChange(event)
                  setValue('latitude', '')
                  setValue('longitude', '')
                  setLocationStatus('idle')
                }}
              />
            )}
            <Input
              label={t('register.address')}
              placeholder="Av. Javier Prado 123"
              readOnly={Boolean(sunatLock?.address)}
              leftIcon={sunatLock?.address ? <Lock className="size-4" /> : undefined}
              hint={sunatLock?.address ? t('verification.lockedSunat') : undefined}
              error={errors.address?.message}
              {...register('address')}
            />
            <div className="flex flex-col gap-2 rounded-lg bg-slate-50 p-4 text-sm sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-slate-600">
                {t(`register.location.${locationStatus === 'locating' ? 'idle' : locationStatus}`)}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={detectLocation}
                isLoading={locationStatus === 'locating'}
                leftIcon={<LocateFixed className="size-4" />}
              >
                {t('register.useLocation')}
              </Button>
            </div>
          </fieldset>

          <fieldset className={cn('grid gap-5 sm:grid-cols-2', step !== 2 && 'hidden')}>
            <legend className="sr-only">{t(isPerson ? 'register.personAdminLegend' : 'register.adminLegend')}</legend>
            <div className="sm:col-span-2">
              <Input
                label={t(isPerson ? 'verification.dniPerson' : 'verification.dni')}
                required={isPerson}
                inputMode="numeric"
                maxLength={8}
                placeholder="46027896"
                // A RUC 10 is the person's DNI with a prefix and a check digit: the DNI is not theirs to change.
                readOnly={isPerson}
                leftIcon={isPerson ? <Lock className="size-4" /> : undefined}
                hint={
                  isPerson && dniLookup !== 'found'
                    ? t('verification.dniFromRuc')
                    : dniLookup === 'found'
                    ? t('verification.dniFound')
                    : dniLookup === 'missing'
                      ? t('verification.dniMissing')
                      : dniLookup === 'skipped'
                        ? t('verification.dniSkipped')
                        : t('verification.dniHint')
                }
                error={errors.dni?.message}
                {...register('dni', {
                  onChange: (event) => releaseReniec(event.target.value),
                  onBlur: () => void lookupDni(),
                })}
              />
            </div>
            <Input
              label={t('register.firstName')}
              required
              autoComplete="given-name"
              readOnly={Boolean(reniecLock?.firstName)}
              leftIcon={reniecLock?.firstName ? <Lock className="size-4" /> : undefined}
              hint={reniecLock?.firstName ? t('verification.lockedReniec') : undefined}
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label={t('register.lastName')}
              required
              autoComplete="family-name"
              readOnly={Boolean(reniecLock?.lastName)}
              leftIcon={reniecLock?.lastName ? <Lock className="size-4" /> : undefined}
              hint={reniecLock?.lastName ? t('verification.lockedReniec') : undefined}
              error={errors.lastName?.message}
              {...register('lastName')}
            />
            <Input label={t('register.email')} type="email" required autoComplete="email" hint={t('register.emailHint')} error={errors.email?.message} {...register('email')} />
            <Input label={t('register.phone')} type="tel" autoComplete="tel" placeholder="987 654 321" error={errors.phone?.message} {...register('phone')} />
            <Input label={t('register.password')} type="password" required autoComplete="new-password" error={errors.password?.message} {...register('password')} />
            <Input label={t('register.confirmPassword')} type="password" required autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            <ul className="grid grid-cols-2 gap-1.5 text-xs sm:col-span-2" aria-label={t('register.passwordRules')}>
              {PASSWORD_RULES.map((rule) => {
                const passes = rule.test(password)
                return (
                  <li key={rule.label} className={cn('flex items-center gap-1.5', passes ? 'text-positive' : 'text-slate-500')}>
                    <Check className="size-3.5" aria-hidden="true" />
                    {t(`register.rules.${rule.label}`)}
                    <span className="sr-only">{passes ? t('register.rulePasses') : t('register.rulePending')}</span>
                  </li>
                )
              })}
            </ul>
          </fieldset>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {step === 0 ? (
              <Link to={PATHS.login} state={returnTo ? { from: returnTo } : undefined} className="text-center text-sm font-medium text-slate-600 hover:text-slate-900 sm:self-center">
                {t('register.haveAccount')}
              </Link>
            ) : (
              <Button variant="secondary" onClick={() => setStep(step - 1)} disabled={isSubmitting} leftIcon={<ArrowLeft className="size-4" />}>
                {t('register.previous')}
              </Button>
            )}
            {/* Different keys: reusing one <button> would turn "Next" into type=submit during the same
                click, and the browser would submit the form before the last step is filled in. */}
            {step < STEPS.length - 1 ? (
              <Button key="next" variant="gradient" onClick={goToNextStep} className="h-11 px-6">
                {t('register.next')} <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button key="submit" type="submit" variant="gradient" isLoading={isSubmitting} className="h-11 px-6">
                {t('register.submit')}
              </Button>
            )}
          </div>
        </form>
    </AuthLayout>
  )
}

/** RENIEC writes names in capitals: "ANA MARIA" becomes "Ana Maria". */
function capitalize(text: string): string {
  return text.toLowerCase().replace(/(^|\s)\p{L}/gu, (letter) => letter.toUpperCase())
}


const normalizePlace = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()

/** The catalogue city that matches SUNAT's province, department or district ("LIMA", "CALLAO"...). */
function cityFromSunat(info: RucInfo) {
  const places = [info.province, info.department, info.district].filter((place): place is string => Boolean(place)).map(normalizePlace)
  return PERU_CITIES.find((city) => places.includes(normalizePlace(city.name)))
}
