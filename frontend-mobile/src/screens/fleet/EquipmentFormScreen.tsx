import { Ionicons } from '@expo/vector-icons'
import { zodResolver } from '@hookform/resolvers/zod'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { useCallback, useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch, type Path } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { z } from 'zod'
import { AppButton } from '../../components/AppButton'
import { Chip } from '../../components/Chip'
import { ErrorView, LoadingView } from '../../components/StateViews'
import { TextField } from '../../components/TextField'
import { useAction } from '../../hooks/useAction'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { useToast } from '../../hooks/useToast'
import { translateMessage } from '../../i18n'
import type { RootScreenProps } from '../../navigation/types'
import { categoryService, equipmentService } from '../../services/rentequipApi'
import { radius, spacing } from '../../theme'
import { makeStyles } from '../../theme/makeStyles'
import type { Equipment, EquipmentCategory, EquipmentCreateRequest, EquipmentStatus } from '../../types/api'
import { ApiError } from '../../utils/apiError'
import { PERU_CITIES } from '../../utils/cities'

const MONEY = /^\d{1,10}(\.\d{1,2})?$/
const CURRENT_YEAR = new Date().getFullYear()
const MAX_PHOTOS = 10
const PHOTO_QUALITY = 0.7
/** RENTED is set by the reservations themselves; the owner moves the machine between these. */
const EDITABLE_STATUSES: EquipmentStatus[] = ['AVAILABLE', 'MAINTENANCE', 'INACTIVE']

/** Messages are i18n keys, translated where the field shows them. */
const equipmentSchema = z
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
    serialNumber: z.string().trim().max(100, 'validation.max100'),
    description: z.string().trim().max(2000, 'validation.max2000'),
    dailyRate: z
      .string()
      .regex(MONEY, 'validation.money')
      .refine((value) => Number(value) >= 0.01, 'validation.ratePositive'),
    weeklyRate: z.string().refine((value) => value === '' || (MONEY.test(value) && Number(value) >= 0.01), {
      message: 'validation.moneyShort',
    }),
    securityDeposit: z.string().regex(MONEY, 'validation.moneyZero'),
    city: z.string().min(1, 'validation.equipmentCity'),
    address: z.string().trim().max(255, 'validation.max255'),
  })
  .refine((values) => values.weeklyRate === '' || Number(values.weeklyRate) <= Number(values.dailyRate) * 7, {
    path: ['weeklyRate'],
    message: 'validation.weeklyTooHigh',
  })

type EquipmentFormValues = z.infer<typeof equipmentSchema>

const SERVER_FIELDS: Partial<Record<string, Path<EquipmentFormValues>>> = {
  name: 'name',
  brand: 'brand',
  model: 'model',
  manufactureYear: 'manufactureYear',
  serialNumber: 'serialNumber',
  description: 'description',
  dailyRate: 'dailyRate',
  weeklyRate: 'weeklyRate',
  securityDeposit: 'securityDeposit',
  categoryIds: 'categoryIds',
  city: 'city',
  latitude: 'city',
  longitude: 'city',
  address: 'address',
}

/** Publish a new machine, or edit or delete one of the fleet when `equipmentId` is given. */
export default function EquipmentFormScreen({ route, navigation }: RootScreenProps<'EquipmentForm'>) {
  const { t } = useTranslation()
  const { equipmentId } = route.params
  const fetchCategories = useCallback((signal: AbortSignal) => categoryService.list(signal), [])
  const fetchEquipment = useCallback(
    (signal: AbortSignal) => (equipmentId ? equipmentService.findById(equipmentId, signal) : Promise.resolve(null)),
    [equipmentId],
  )
  const categories = useAsync(fetchCategories)
  const equipment = useAsync(fetchEquipment)

  if (categories.isLoading || equipment.isLoading) return <LoadingView label={t('equipmentForm.preparing')} />
  if (categories.error) return <ErrorView error={categories.error} onRetry={categories.reload} />
  if (equipment.error) return <ErrorView error={equipment.error} onRetry={equipment.reload} />

  return <EquipmentForm categories={categories.data ?? []} equipment={equipment.data} onDone={() => navigation.goBack()} />
}

interface EquipmentFormProps {
  categories: EquipmentCategory[]
  equipment: Equipment | null
  onDone: () => void
}

type TextFieldName = Exclude<keyof EquipmentFormValues, 'categoryIds'>

function EquipmentForm({ categories, equipment, onDone }: EquipmentFormProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const { user } = useAuth()
  const toast = useToast()
  const { run: runDelete, isRunning: isDeleting } = useAction()
  const isEditing = equipment !== null
  const [imageUrls, setImageUrls] = useState<string[]>(equipment?.imageUrls ?? [])
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [status, setStatus] = useState<EquipmentStatus>(equipment?.status ?? 'AVAILABLE')
  const [coords, setCoords] = useState(
    equipment ? { latitude: equipment.latitude, longitude: equipment.longitude } : null,
  )
  const [isLocating, setIsLocating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    mode: 'onTouched',
    defaultValues: {
      name: equipment?.name ?? '',
      // The detail lists category names; the form works with ids.
      categoryIds: categories.filter((category) => equipment?.categories.includes(category.name)).map((category) => category.id),
      brand: equipment?.brand ?? '',
      model: equipment?.model ?? '',
      manufactureYear: equipment?.manufactureYear ? String(equipment.manufactureYear) : '',
      serialNumber: equipment?.serialNumber ?? '',
      description: equipment?.description ?? '',
      dailyRate: equipment ? String(equipment.dailyRate) : '',
      weeklyRate: equipment?.weeklyRate ? String(equipment.weeklyRate) : '',
      securityDeposit: equipment ? String(equipment.securityDeposit) : '',
      city: equipment?.city ?? '',
      address: equipment?.address ?? '',
    },
  })
  const selectedCategories = useWatch({ control, name: 'categoryIds' })
  const selectedCity = useWatch({ control, name: 'city' })

  async function addPhoto(source: 'camera' | 'library') {
    if (imageUrls.length >= MAX_PHOTOS) return
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      toast.info(t('equipmentForm.noPermission'), source === 'camera' ? t('equipmentForm.allowCamera') : t('equipmentForm.allowPhotos'))
      return
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: PHOTO_QUALITY })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: PHOTO_QUALITY })
    const asset = result.canceled ? undefined : result.assets[0]
    if (!asset) return
    setUploadProgress(0)
    try {
      const url = await equipmentService.uploadImage(
        { uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName },
        setUploadProgress,
      )
      setImageUrls((current) => [...current, url])
    } catch (error) {
      toast.error(t('equipmentForm.uploadFailed'), ApiError.from(error).message)
    } finally {
      setUploadProgress(null)
    }
  }

  /** GPS position of the machine; without it the city's center is used. */
  async function locateEquipment() {
    setIsLocating(true)
    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== 'granted') {
        toast.info(t('equipmentForm.noLocationPermission'), t('equipmentForm.cityCenterFallback'))
        return
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude })
      toast.success(t('equipmentForm.locationSaved'))
    } catch {
      toast.error(t('equipmentForm.locationFailed'), t('equipmentForm.cityCenterFallback'))
    } finally {
      setIsLocating(false)
    }
  }

  async function onSubmit(values: EquipmentFormValues) {
    if (!user) return
    setFormError(null)
    const city = PERU_CITIES.find((option) => option.name === values.city)
    const location = coords ?? { latitude: city?.latitude ?? 0, longitude: city?.longitude ?? 0 }
    const optional = (value: string) => (value === '' ? undefined : value)
    const body: EquipmentCreateRequest = {
      name: values.name,
      brand: values.brand,
      model: values.model,
      manufactureYear: values.manufactureYear ? Number(values.manufactureYear) : undefined,
      serialNumber: optional(values.serialNumber),
      description: optional(values.description),
      dailyRate: Number(values.dailyRate),
      weeklyRate: values.weeklyRate ? Number(values.weeklyRate) : undefined,
      securityDeposit: Number(values.securityDeposit),
      address: optional(values.address),
      city: values.city,
      latitude: Number(location.latitude.toFixed(7)),
      longitude: Number(location.longitude.toFixed(7)),
      imageUrls,
      categoryIds: values.categoryIds,
      ownerCompanyId: user.companyId,
    }
    try {
      if (equipment) {
        // PATCH: everything but the serial number and the owner, which cannot change.
        const { serialNumber: _serialNumber, ownerCompanyId: _ownerCompanyId, ...changes } = body
        await equipmentService.update(equipment.id, { ...changes, status })
        toast.success(t('equipmentForm.saved'))
      } else {
        await equipmentService.create(body)
        toast.success(t('equipmentForm.published'), t('equipmentForm.publishedHint'))
      }
      onDone()
    } catch (error) {
      const apiError = ApiError.from(error)
      let mapped = false
      for (const detail of apiError.details) {
        const field = SERVER_FIELDS[detail.field]
        if (field) {
          setError(field, { message: detail.message })
          mapped = true
        }
      }
      setFormError(mapped ? t('common.checkFields') : apiError.message)
    }
  }

  function confirmDelete() {
    if (!equipment) return
    Alert.alert(t('equipmentForm.deleteTitle'), t('equipmentForm.deleteMessage', { name: equipment.name }), [
      { text: t('common.back'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () =>
          void runDelete(() => equipmentService.remove(equipment.id), {
            successMessage: t('equipmentForm.deleted'),
            errorTitle: t('equipmentForm.deleteFailed'),
            onSuccess: onDone,
          }),
      },
    ])
  }

  const textField = (
    name: TextFieldName,
    options: { required?: boolean; keyboard?: 'default' | 'decimal-pad' | 'number-pad'; placeholder?: string; multiline?: boolean; editable?: boolean } = {},
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <TextField
          label={t(`equipmentForm.fields.${name}`)}
          required={options.required}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={errors[name]?.message}
          keyboardType={options.keyboard ?? 'default'}
          placeholder={options.placeholder}
          multiline={options.multiline}
          editable={options.editable ?? true}
          style={options.multiline ? styles.multiline : undefined}
        />
      )}
    />
  )

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {formError && (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        )}

        <Section title={t('equipmentForm.photos')} description={t('equipmentForm.photosHint', { max: MAX_PHOTOS })}>
          <View style={styles.photos}>
            {imageUrls.map((url, index) => (
              <View key={url} style={styles.photo}>
                <Image source={{ uri: url }} style={styles.photoImage} />
                {index === 0 && <Text style={styles.cover}>{t('equipmentForm.cover')}</Text>}
                <Pressable
                  style={styles.removePhoto}
                  onPress={() => setImageUrls((current) => current.filter((item) => item !== url))}
                  accessibilityRole="button"
                  accessibilityLabel={t('equipmentForm.removePhoto', { n: index + 1 })}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
          </View>
          {uploadProgress !== null && <Text style={styles.caption}>{t('equipmentForm.uploading', { progress: uploadProgress })}</Text>}
          {imageUrls.length < MAX_PHOTOS && (
            <View style={styles.row}>
              <AppButton
                title={t('equipmentForm.camera')}
                icon="camera-outline"
                variant="secondary"
                style={styles.flex}
                disabled={uploadProgress !== null}
                onPress={() => void addPhoto('camera')}
              />
              <AppButton
                title={t('equipmentForm.gallery')}
                icon="images-outline"
                variant="secondary"
                style={styles.flex}
                disabled={uploadProgress !== null}
                onPress={() => void addPhoto('library')}
              />
            </View>
          )}
        </Section>

        <Section title={t('equipmentForm.equipment')} description={t('equipmentForm.equipmentHint')}>
          {textField('name', { required: true, placeholder: t('equipmentForm.namePlaceholder') })}
          <View style={styles.row}>
            <View style={styles.flex}>{textField('brand', { required: true })}</View>
            <View style={styles.flex}>{textField('model', { required: true })}</View>
          </View>
          <View style={styles.row}>
            <View style={styles.flex}>{textField('manufactureYear', { keyboard: 'number-pad' })}</View>
            <View style={styles.flex}>{textField('serialNumber', { editable: !isEditing })}</View>
          </View>
          <Text style={styles.label}>
            {t('equipmentForm.categories')} <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.chips}>
            {categories.map((category) => {
              const selected = selectedCategories.includes(category.id)
              return (
                <Chip
                  key={category.id}
                  label={category.name}
                  selected={selected}
                  onPress={() =>
                    setValue(
                      'categoryIds',
                      selected ? selectedCategories.filter((id) => id !== category.id) : [...selectedCategories, category.id],
                      { shouldValidate: true },
                    )
                  }
                />
              )
            })}
          </View>
          {errors.categoryIds && <Text style={styles.errorText}>{translateMessage(errors.categoryIds.message)}</Text>}
          {textField('description', { multiline: true, placeholder: t('equipmentForm.descriptionPlaceholder') })}
        </Section>

        <Section title={t('equipmentForm.rates')} description={t('equipmentForm.ratesHint')}>
          <View style={styles.row}>
            <View style={styles.flex}>{textField('dailyRate', { required: true, keyboard: 'decimal-pad' })}</View>
            <View style={styles.flex}>{textField('weeklyRate', { keyboard: 'decimal-pad' })}</View>
          </View>
          {textField('securityDeposit', { required: true, keyboard: 'decimal-pad' })}
        </Section>

        <Section title={t('equipmentForm.location')} description={t('equipmentForm.locationHint')}>
          <Text style={styles.label}>
            {t('equipmentForm.city')} <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.chips}>
            {PERU_CITIES.map((city) => (
              <Chip
                key={city.name}
                label={city.name}
                selected={selectedCity === city.name}
                onPress={() => setValue('city', city.name, { shouldValidate: true })}
              />
            ))}
          </View>
          {errors.city && <Text style={styles.errorText}>{translateMessage(errors.city.message)}</Text>}
          {textField('address')}
          <AppButton
            title={coords ? t('equipmentForm.gpsSaved') : t('equipmentForm.useGps')}
            icon="navigate-outline"
            variant="secondary"
            isLoading={isLocating}
            onPress={() => void locateEquipment()}
          />
        </Section>

        {isEditing && (
          <Section title={t('equipmentForm.status')} description={t('equipmentForm.statusHint')}>
            <View style={styles.chips}>
              {EDITABLE_STATUSES.map((option) => (
                <Chip key={option} label={t(`status.equipment.${option}`)} selected={status === option} onPress={() => setStatus(option)} />
              ))}
            </View>
          </Section>
        )}

        <AppButton
          title={isEditing ? t('equipmentForm.save') : t('equipmentForm.publish')}
          icon={isEditing ? 'save-outline' : 'cloud-upload-outline'}
          onPress={handleSubmit(onSubmit)}
          isLoading={isSubmitting}
          disabled={uploadProgress !== null || isDeleting}
        />
        {isEditing && (
          <AppButton title={t('equipmentForm.delete')} icon="trash-outline" variant="danger" onPress={confirmDelete} isLoading={isDeleting} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const styles = useStyles()
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.caption}>{description}</Text>
      {children}
    </View>
  )
}

const useStyles = makeStyles((colors, typography) => ({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 48 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  sectionTitle: typography.heading,
  caption: typography.caption,
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  required: { color: colors.danger },
  row: { flexDirection: 'row', gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  multiline: { minHeight: 96, textAlignVertical: 'top', paddingTop: spacing.md },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photo: { width: '31%', aspectRatio: 1 },
  photoImage: { width: '100%', height: '100%', borderRadius: radius.sm, backgroundColor: colors.border },
  cover: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    backgroundColor: colors.brand,
    color: colors.onBrand,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(15,23,42,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: spacing.md },
  errorText: { flex: 1, color: colors.danger, fontSize: 13 },
}))
