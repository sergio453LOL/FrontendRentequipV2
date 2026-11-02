import { LocateFixed, Send } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import { Controller, useWatch, type Path } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../components/common/Button'
import { ChipSelect } from '../components/common/ChipSelect'
import { Input } from '../components/common/Input'
import { PageHeader } from '../components/common/PageHeader'
import { Select } from '../components/common/Select'
import { Textarea } from '../components/common/Textarea'
import { AdPreview } from '../components/equipment/AdPreview'
import { ImageUploader } from '../components/equipment/ImageUploader'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import { useMutation } from '../hooks/useMutation'
import { useZodForm } from '../hooks/useZodForm'
import { buildPath, PATHS } from '../routes/paths'
import { ENDPOINTS } from '../services/endpoints'
import { equipmentService } from '../services/equipmentService'
import type { EquipmentCategory } from '../types'
import { categoryName } from '../utils/categoryName'
import { findCity, PERU_CITIES } from '../utils/cities'
import { applyServerFieldErrors } from '../utils/formErrors'

const MONEY = /^\d{1,10}(\.\d{1,2})?$/
const CURRENT_YEAR = new Date().getFullYear()

/** Messages are i18n keys (validation.max100, ...), translated where the field shows them. */
const optionalText = (max: 100 | 255 | 2000 | 4000) => z.string().trim().max(max, `validation.max${max}`)

const publishSchema = z
  .object({
    name: z.string().trim().min(3, 'validation.min3').max(150, 'validation.max150'),
    categoryIds: z.array(z.number()).min(1, 'validation.categoriesRequired'),
    brand: z.string().trim().min(1, 'validation.brandRequired').max(80, 'validation.max80'),
    model: z.string().trim().min(1, 'validation.modelRequired').max(80, 'validation.max80'),
    manufactureYear: z
      .string()
      .refine((value) => value === '' || (/^\d{4}$/.test(value) && Number(value) >= 1950 && Number(value) <= CURRENT_YEAR + 1), {
        message: 'validation.yearRange',
      }),
    serialNumber: optionalText(100),
    description: optionalText(2000),
    specifications: optionalText(4000),
    dailyRate: z
      .string()
      .regex(MONEY, 'validation.money')
      .refine((value) => Number(value) >= 0.01, 'validation.ratePositive'),
    weeklyRate: z.string().refine((value) => value === '' || (MONEY.test(value) && Number(value) >= 0.01), {
      message: 'validation.moneyShort',
    }),
    securityDeposit: z.string().regex(MONEY, 'validation.moneyZero'),
    city: z.string().min(1, 'validation.equipmentCity'),
    address: optionalText(255),
    latitude: z.string(),
    longitude: z.string(),
  })
  .refine((values) => values.weeklyRate === '' || Number(values.weeklyRate) <= Number(values.dailyRate) * 7, {
    path: ['weeklyRate'],
    message: 'validation.weeklyTooHigh',
  })

type PublishFormValues = z.infer<typeof publishSchema>

const SERVER_FIELD_MAP: Partial<Record<string, Path<PublishFormValues>>> = {
  latitude: 'city',
  longitude: 'city',
  imageUrls: 'name',
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 rounded-2xl border border-slate-200/80 bg-white p-5 transition-shadow duration-300 focus-within:shadow-xl sm:p-6 lg:grid-cols-3 xl:grid-cols-1">
      <div>
        <h2 className="text-base font-bold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:col-span-2 xl:col-span-1">{children}</div>
    </section>
  )
}

export default function PublishEquipmentPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const categories = useFetch<EquipmentCategory[]>(ENDPOINTS.categories)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [locationNote, setLocationNote] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useZodForm(publishSchema, {
    defaultValues: {
      name: '',
      categoryIds: [],
      brand: '',
      model: '',
      manufactureYear: '',
      serialNumber: '',
      description: '',
      specifications: '',
      dailyRate: '',
      weeklyRate: '',
      securityDeposit: '0',
      city: '',
      address: '',
      latitude: '',
      longitude: '',
    },
  })

  // The preview follows the form as it is typed.
  const draft = useWatch({ control })
  const categoryNames = (categories.data ?? [])
    .filter((category) => (draft.categoryIds ?? []).includes(category.id))
    .map((category) => categoryName(category.name))

  const publish = useMutation(equipmentService.create, {
    successMessage: (equipment) => t('publish.published', { name: equipment.name }),
    errorTitle: t('publish.failed'),
    onSuccess: (equipment) => navigate(buildPath.equipmentDetail(equipment.id), { replace: true }),
    onError: (error) => applyServerFieldErrors(error, setError, SERVER_FIELD_MAP),
  })

  const handleImagesChange = useCallback((urls: string[]) => setImageUrls(urls), [])

  function detectLocation() {
    if (!('geolocation' in navigator)) {
      setLocationNote(t('publish.locationUnsupported'))
      return
    }
    setLocationNote(t('publish.locating'))
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', position.coords.latitude.toFixed(7))
        setValue('longitude', position.coords.longitude.toFixed(7))
        setLocationNote(t('publish.locationDetected'))
      },
      () => setLocationNote(t('publish.locationDenied')),
      { timeout: 10_000 },
    )
  }

  async function onSubmit(values: PublishFormValues) {
    if (!user) return
    const city = findCity(values.city)
    const latitude = values.latitude ? Number(values.latitude) : city?.latitude
    const longitude = values.longitude ? Number(values.longitude) : city?.longitude
    if (latitude === undefined || longitude === undefined) {
      setError('city', { message: 'validation.cityInvalid' })
      return
    }
    await publish.mutate({
      name: values.name,
      categoryIds: values.categoryIds,
      brand: values.brand,
      model: values.model,
      manufactureYear: values.manufactureYear ? Number(values.manufactureYear) : undefined,
      serialNumber: values.serialNumber || undefined,
      description: values.description || undefined,
      specifications: values.specifications || undefined,
      dailyRate: Number(values.dailyRate),
      weeklyRate: values.weeklyRate ? Number(values.weeklyRate) : undefined,
      securityDeposit: Number(values.securityDeposit),
      currency: 'PEN',
      city: values.city,
      address: values.address || undefined,
      latitude,
      longitude,
      imageUrls,
      ownerCompanyId: user.companyId,
    })
  }

  const cityField = register('city')

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <PageHeader
        title={t('publish.title')}
        description={t('publish.description')}
        breadcrumbs={[{ label: t('nav.dashboard'), to: PATHS.home }, { label: t('publish.title') }]}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="min-w-0 space-y-6">
        <Section title={t('publish.detailsTitle')} description={t('publish.detailsText')}>
          <Input className="sm:col-span-2" label={t('publish.name')} required placeholder={t('publish.namePlaceholder')} error={errors.name?.message} {...register('name')} />
          <Input label={t('publish.brand')} required placeholder="Caterpillar" error={errors.brand?.message} {...register('brand')} />
          <Input label={t('publish.model')} required placeholder="320 GC" error={errors.model?.message} {...register('model')} />
          <Input label={t('publish.year')} inputMode="numeric" maxLength={4} placeholder={String(CURRENT_YEAR - 3)} error={errors.manufactureYear?.message} {...register('manufactureYear')} />
          <Input label={t('publish.serial')} placeholder="CAT0320GCXYZ" error={errors.serialNumber?.message} {...register('serialNumber')} />
          <div className="sm:col-span-2">
            <Controller
              control={control}
              name="categoryIds"
              render={({ field }) => (
                <ChipSelect
                  label={t('publish.categories')}
                  required
                  options={(categories.data ?? []).map((category) => ({ value: category.id, label: categoryName(category.name) }))}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.categoryIds?.message}
                  hint={
                    categories.error
                      ? t('publish.categoriesError')
                      : categories.data?.length === 0
                        ? t('publish.categoriesEmpty')
                        : undefined
                  }
                />
              )}
            />
          </div>
          <Textarea className="sm:col-span-2" label={t('publish.descriptionLabel')} rows={4} placeholder={t('publish.descriptionPlaceholder')} error={errors.description?.message} {...register('description')} />
        </Section>

        <Section title={t('publish.ratesTitle')} description={t('publish.ratesText')}>
          <Input label={t('publish.dailyRate')} required inputMode="decimal" placeholder="850.00" error={errors.dailyRate?.message} {...register('dailyRate')} />
          <Input label={t('publish.weeklyRate')} inputMode="decimal" placeholder="5000.00" hint={t('publish.optional')} error={errors.weeklyRate?.message} {...register('weeklyRate')} />
          <Input label={t('publish.deposit')} required inputMode="decimal" placeholder="2000.00" error={errors.securityDeposit?.message} {...register('securityDeposit')} />
        </Section>

        <Section title={t('publish.specsTitle')} description={t('publish.specsText')}>
          <Textarea
            className="sm:col-span-2"
            label={t('publish.specs')}
            rows={6}
            placeholder={t('publish.specsPlaceholder')}
            error={errors.specifications?.message}
            {...register('specifications')}
          />
        </Section>

        <Section title={t('publish.locationTitle')} description={t('publish.locationText')}>
          <Select
            label={t('publish.city')}
            required
            placeholder={t('publish.cityPlaceholder')}
            options={PERU_CITIES.map((city) => ({ value: city.name, label: city.name }))}
            error={errors.city?.message}
            {...cityField}
            onChange={(event) => {
              void cityField.onChange(event)
              setValue('latitude', '')
              setValue('longitude', '')
              setLocationNote(null)
            }}
          />
          <Input label={t('publish.address')} placeholder="Av. Industrial 450, Ate" error={errors.address?.message} {...register('address')} />
          <div className="flex flex-col gap-2 rounded-lg bg-slate-50 p-4 text-sm sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-600">{locationNote ?? t('publish.locationDefault')}</p>
            <Button variant="secondary" size="sm" onClick={detectLocation} leftIcon={<LocateFixed className="size-4" />}>
              {t('publish.useLocation')}
            </Button>
          </div>
        </Section>

        <Section title={t('publish.photosTitle')} description={t('publish.photosText')}>
          <div className="sm:col-span-2">
            <ImageUploader onChange={handleImagesChange} onBusyChange={setIsUploading} />
          </div>
        </Section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={publish.isLoading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" size="lg" variant="action" isLoading={publish.isLoading} disabled={isUploading} leftIcon={<Send className="size-4" />}>
            {isUploading ? t('publish.waitingPhotos') : t('publish.submit')}
          </Button>
        </div>
      </form>

      <AdPreview
        name={draft.name ?? ''}
        brand={draft.brand ?? ''}
        model={draft.model ?? ''}
        year={draft.manufactureYear ?? ''}
        city={draft.city ?? ''}
        companyName={user?.companyName ?? ''}
        dailyRate={draft.dailyRate ?? ''}
        weeklyRate={draft.weeklyRate ?? ''}
        securityDeposit={draft.securityDeposit ?? ''}
        categories={categoryNames}
        coverUrl={imageUrls[0]}
      />
      </div>
    </div>
  )
}
