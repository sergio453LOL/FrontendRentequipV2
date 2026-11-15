import { Building2, Check, KeyRound, UserRound, type LucideIcon } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '../components/common/Button'
import { ErrorState } from '../components/common/ErrorState'
import { Input } from '../components/common/Input'
import { PageHeader } from '../components/common/PageHeader'
import { Select } from '../components/common/Select'
import { Textarea } from '../components/common/Textarea'
import { Avatar } from '../components/profile/Avatar'
import { OwnerCard } from '../components/profile/OwnerCard'
import { ProfileImageField } from '../components/profile/ProfileImageField'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import { useQueryParam } from '../hooks/useQueryParam'
import { requestRefresh } from '../hooks/useRefreshSignal'
import { useToast } from '../hooks/useToast'
import { useZodForm } from '../hooks/useZodForm'
import { ENDPOINTS } from '../services/endpoints'
import { profileService } from '../services/profileService'
import type { Company, User, WithLinks } from '../types'
import { ApiError } from '../utils/apiError'
import { findCity, PERU_CITIES } from '../utils/cities'
import { cn } from '../utils/cn'
import { applyServerFieldErrors } from '../utils/formErrors'
import { meetsPasswordRules, PASSWORD_RULES } from '../utils/passwordRules'

const TABS = [
  { id: 'account', icon: UserRound },
  { id: 'company', icon: Building2 },
  { id: 'security', icon: KeyRound },
] as const satisfies ReadonlyArray<{ id: string; icon: LucideIcon }>

type TabId = (typeof TABS)[number]['id']

const isTab = (value: string): value is TabId => TABS.some((tab) => tab.id === value)

const DESCRIPTION_MAX = 1000

const optionalPhone = z.string().trim().max(20, 'validation.max20').regex(/^[\d\s+()-]*$/, 'validation.phoneChars')

const accountSchema = z.object({
  avatarUrl: z.string(),
  firstName: z.string().trim().min(1, 'validation.firstNameRequired').max(80, 'validation.max80'),
  lastName: z.string().trim().min(1, 'validation.lastNameRequired').max(80, 'validation.max80'),
  phone: optionalPhone,
})

const companySchema = z.object({
  logoUrl: z.string(),
  name: z.string().trim().min(2, 'validation.min2').max(150, 'validation.max150'),
  description: z.string().trim().max(DESCRIPTION_MAX, 'validation.max1000'),
  email: z.string().trim().pipe(z.email('validation.emailInvalid')),
  phone: optionalPhone,
  city: z.string().min(1, 'validation.cityRequired'),
  address: z.string().trim().max(255, 'validation.max255'),
})

const securitySchema = z
  .object({
    currentPassword: z.string().min(1, 'validation.passwordRequired'),
    newPassword: z.string().refine(meetsPasswordRules, 'validation.passwordRules'),
    confirmPassword: z.string().min(1, 'validation.confirmRequired'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'validation.passwordMismatch',
  })

type AccountValues = z.infer<typeof accountSchema>
type CompanyValues = z.infer<typeof companySchema>
type SecurityValues = z.infer<typeof securitySchema>

/**
 * The signed-in account: who you are, how your company looks to renters, and your password. Each area is
 * its own tab (kept in the URL, so "?tab=company" can be linked), with a preview of the result beside
 * the form and one Save at the foot of it.
 */
export default function ProfilePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [tabParam, setTabParam] = useQueryParam('tab', 'account')
  const activeTab: TabId = isTab(tabParam) ? tabParam : 'account'
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ account: null, company: null, security: null })

  const me = useFetch<User>(ENDPOINTS.me)
  const company = useFetch<WithLinks<Company>>(user ? ENDPOINTS.company(user.companyId) : null)

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = TABS[(index + step + TABS.length) % TABS.length].id
    setTabParam(next)
    tabRefs.current[next]?.focus()
  }

  const fullName = me.data ? `${me.data.firstName} ${me.data.lastName}` : ''

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <PageHeader title={t('profile.title')} description={t('profile.description')} />

      <div className="flex items-center gap-4">
        {me.data ? (
          <Avatar name={fullName} src={me.data.avatarUrl} size="md" />
        ) : (
          <span className="size-10 rounded-full bg-raised" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-ink">{fullName || ' '}</p>
          <p className="truncate text-sm text-slate-600">
            {user ? `${t(`roles.${user.role}`)} · ${user.companyName}` : ' '}
          </p>
        </div>
      </div>

      <div role="tablist" aria-label={t('profile.sections')} className="flex gap-6 overflow-x-auto overflow-y-hidden border-b border-slate-200 [scrollbar-width:none]">
        {TABS.map(({ id, icon: Icon }, index) => {
          const isActive = id === activeTab
          return (
            <button
              key={id}
              ref={(element) => {
                tabRefs.current[id] = element
              }}
              type="button"
              role="tab"
              id={`profile-tab-${id}`}
              aria-selected={isActive}
              aria-controls={`profile-panel-${id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setTabParam(id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              className={cn(
                '-mb-px flex h-11 shrink-0 items-center gap-2 border-b-2 text-sm font-medium transition-colors duration-200',
                isActive ? 'border-ink text-ink' : 'border-transparent text-slate-600 hover:text-ink',
              )}
            >
              <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
              {t(`profile.tabs.${id}`)}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`profile-panel-${activeTab}`} aria-labelledby={`profile-tab-${activeTab}`}>
        {activeTab === 'account' &&
          (me.error ? (
            <ErrorState error={me.error} onRetry={me.refetch} />
          ) : me.data ? (
            <AccountSection key={me.data.id} me={me.data} />
          ) : (
            <SectionSkeleton />
          ))}
        {activeTab === 'company' &&
          (company.error ? (
            <ErrorState error={company.error} onRetry={company.refetch} />
          ) : company.data ? (
            <CompanySection key={company.data.id} company={company.data} canEdit={user?.role === 'ADMIN'} />
          ) : (
            <SectionSkeleton />
          ))}
        {activeTab === 'security' && <SecuritySection />}
      </div>
    </div>
  )
}

/** Label column (what this is, and a preview of the result) beside the form panel. */
function SettingsRow({ title, description, aside, children }: { title: string; description: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-10">
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {aside}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">{children}</div>
    </section>
  )
}

function PanelFooter({ isSubmitting, isDirty, label }: { isSubmitting: boolean; isDirty: boolean; label: string }) {
  const { t } = useTranslation()
  return (
    <div className="mt-6 flex items-center justify-end gap-3">
      {!isDirty && <span className="text-xs text-slate-500">{t('profile.noChanges')}</span>}
      <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={!isDirty}>
        {label}
      </Button>
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-10" aria-hidden="true">
      <div className="space-y-2">
        <div className="h-5 w-40 rounded bg-raised" />
        <div className="h-4 w-full rounded bg-raised" />
        <div className="h-4 w-2/3 rounded bg-raised" />
      </div>
      <div className="h-80 rounded-xl bg-raised" />
    </div>
  )
}

function AccountSection({ me }: { me: User }) {
  const { t } = useTranslation()
  const toast = useToast()
  const form = useZodForm(accountSchema, {
    defaultValues: { avatarUrl: me.avatarUrl ?? '', firstName: me.firstName, lastName: me.lastName, phone: me.phone ?? '' },
  })
  const { register, handleSubmit, watch, setValue, reset, setError, formState } = form
  const { errors, isSubmitting, isDirty } = formState
  const [firstName, lastName, avatarUrl] = watch(['firstName', 'lastName', 'avatarUrl'])
  const previewName = `${firstName} ${lastName}`.trim() || me.email

  async function onSubmit(values: AccountValues) {
    try {
      const saved = await profileService.updateMe(values)
      reset({ avatarUrl: saved.avatarUrl ?? '', firstName: saved.firstName, lastName: saved.lastName, phone: saved.phone ?? '' })
      toast.success(t('profile.account.saved'))
      requestRefresh()
    } catch (error) {
      if (!applyServerFieldErrors(error, setError)) toast.error(t('profile.saveFailed'), ApiError.from(error).message)
    }
  }

  return (
    <SettingsRow
      title={t('profile.account.title')}
      description={t('profile.account.description')}
      aside={
        <Preview label={t('profile.account.preview')}>
          <div className="theme-light flex items-center gap-3 rounded-lg bg-ink px-4 py-3">
            <Avatar name={previewName} src={avatarUrl || null} size="sm" tone="dark" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{previewName}</p>
              <p className="truncate text-xs text-slate-400">{me.email}</p>
            </div>
          </div>
        </Preview>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <ProfileImageField
          label={t('profile.account.photo')}
          name={previewName}
          shape="circle"
          value={avatarUrl}
          onChange={(url) => setValue('avatarUrl', url, { shouldDirty: true })}
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input label={t('register.firstName')} required autoComplete="given-name" error={errors.firstName?.message} {...register('firstName')} />
          <Input label={t('register.lastName')} required autoComplete="family-name" error={errors.lastName?.message} {...register('lastName')} />
          <Input label={t('register.phone')} type="tel" autoComplete="tel" placeholder="987 654 321" error={errors.phone?.message} {...register('phone')} />
          <Input label={t('register.email')} type="email" value={me.email} readOnly disabled hint={t('profile.account.emailLocked')} />
        </div>
        <PanelFooter isSubmitting={isSubmitting} isDirty={isDirty} label={t('profile.save')} />
      </form>
    </SettingsRow>
  )
}

function CompanySection({ company, canEdit }: { company: Company; canEdit: boolean }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { updateUser } = useAuth()
  const toValues = (source: Company): CompanyValues => ({
    logoUrl: source.logoUrl ?? '',
    name: source.name,
    description: source.description ?? '',
    email: source.email,
    phone: source.phone ?? '',
    city: source.city,
    address: source.address ?? '',
  })
  const { register, handleSubmit, watch, setValue, reset, setError, formState } = useZodForm(companySchema, {
    defaultValues: toValues(company),
  })
  const { errors, isSubmitting, isDirty } = formState
  const [name, logoUrl, description, city] = watch(['name', 'logoUrl', 'description', 'city'])
  // Older companies may sit in a city outside the list; keep it selectable so the form still saves.
  const cityOptions = PERU_CITIES.some((option) => option.name === company.city)
    ? PERU_CITIES.map((option) => ({ value: option.name, label: option.name }))
    : [{ value: company.city, label: company.city }, ...PERU_CITIES.map((option) => ({ value: option.name, label: option.name }))]

  async function onSubmit(values: CompanyValues) {
    const coordinates = values.city !== company.city ? findCity(values.city) : undefined
    try {
      const saved = await profileService.updateCompany(company.id, {
        ...values,
        ...(coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : {}),
      })
      reset(toValues(saved))
      updateUser({ companyName: saved.name })
      toast.success(t('profile.company.saved'))
      requestRefresh()
    } catch (error) {
      if (!applyServerFieldErrors(error, setError)) toast.error(t('profile.saveFailed'), ApiError.from(error).message)
    }
  }

  return (
    <SettingsRow
      title={t('profile.company.title')}
      description={t('profile.company.description')}
      aside={
        <Preview label={t('profile.company.preview')}>
          <OwnerCard name={name || company.name} logoUrl={logoUrl || null} city={city} description={description} />
        </Preview>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        {!canEdit && (
          <p className="mb-5 rounded-lg bg-raised px-4 py-3 text-sm text-slate-700">{t('profile.company.adminOnly')}</p>
        )}
        <fieldset disabled={!canEdit} className="space-y-6">
          <legend className="sr-only">{t('profile.company.title')}</legend>
          <ProfileImageField
            label={t('profile.company.logo')}
            name={name || company.name}
            shape="square"
            value={logoUrl}
            disabled={!canEdit}
            onChange={(url) => setValue('logoUrl', url, { shouldDirty: true })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input className="sm:col-span-2" label={t('register.companyName')} required error={errors.name?.message} {...register('name')} />
            <Textarea
              className="sm:col-span-2"
              label={t('profile.company.about')}
              rows={4}
              maxLength={DESCRIPTION_MAX}
              placeholder={t('profile.company.aboutPlaceholder')}
              hint={t('profile.company.aboutHint', { count: description.length, max: DESCRIPTION_MAX })}
              error={errors.description?.message}
              {...register('description')}
            />
            <Input label={t('register.companyEmail')} type="email" required error={errors.email?.message} {...register('email')} />
            <Input label={t('register.companyPhone')} type="tel" placeholder="01 234 5678" error={errors.phone?.message} {...register('phone')} />
            <Select label={t('register.city')} required options={cityOptions} error={errors.city?.message} {...register('city')} />
            <Input label={t('register.address')} placeholder="Av. Javier Prado 123" error={errors.address?.message} {...register('address')} />
            <Input label={t('register.taxId')} value={company.taxId} readOnly disabled hint={t('profile.company.taxIdLocked')} />
          </div>
        </fieldset>
        {canEdit && <PanelFooter isSubmitting={isSubmitting} isDirty={isDirty} label={t('profile.save')} />}
      </form>
    </SettingsRow>
  )
}

function SecuritySection() {
  const { t } = useTranslation()
  const toast = useToast()
  const [changedAt, setChangedAt] = useState<Date | null>(null)
  const { register, handleSubmit, watch, reset, setError, formState } = useZodForm(securitySchema, {
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const { errors, isSubmitting, isDirty } = formState
  const newPassword = watch('newPassword')

  async function onSubmit(values: SecurityValues) {
    try {
      await profileService.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      reset()
      setChangedAt(new Date())
      toast.success(t('profile.security.saved'))
    } catch (error) {
      const apiError = ApiError.from(error)
      if (apiError.code === 'WRONG_CURRENT_PASSWORD') {
        setError('currentPassword', { type: 'server', message: 'profile.security.wrongCurrent' }, { shouldFocus: true })
      } else if (apiError.code === 'SAME_PASSWORD') {
        setError('newPassword', { type: 'server', message: 'profile.security.samePassword' }, { shouldFocus: true })
      } else if (!applyServerFieldErrors(error, setError)) {
        toast.error(t('profile.saveFailed'), apiError.message)
      }
    }
  }

  return (
    <SettingsRow
      title={t('profile.security.title')}
      description={t('profile.security.description')}
      aside={
        <ul className="space-y-2 text-sm" aria-label={t('register.passwordRules')}>
          {PASSWORD_RULES.map((rule) => {
            const passes = rule.test(newPassword)
            return (
              <li key={rule.label} className={cn('flex items-center gap-2', passes ? 'text-positive' : 'text-slate-600')}>
                <Check className="size-4" aria-hidden="true" />
                {t(`register.rules.${rule.label}`)}
                <span className="sr-only">{passes ? t('register.rulePasses') : t('register.rulePending')}</span>
              </li>
            )
          })}
        </ul>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <Input
            label={t('profile.security.current')}
            type="password"
            required
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t('profile.security.new')} type="password" required autoComplete="new-password" error={errors.newPassword?.message} {...register('newPassword')} />
            <Input label={t('register.confirmPassword')} type="password" required autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {changedAt && (
            <span className="text-xs text-slate-500" role="status">
              {t('profile.security.changedAt', { time: changedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
            </span>
          )}
          <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={!isDirty}>
            {t('profile.security.submit')}
          </Button>
        </div>
      </form>
    </SettingsRow>
  )
}

function Preview({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="space-y-2">
      <figcaption className="text-xs font-medium text-slate-500">{label}</figcaption>
      {children}
    </figure>
  )
}
