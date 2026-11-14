import { Pencil, Plus, Save, Tags, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '../components/common/Button'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { Input } from '../components/common/Input'
import { PageHeader } from '../components/common/PageHeader'
import { SkeletonLoader } from '../components/common/SkeletonLoader'
import { useFetch } from '../hooks/useFetch'
import { useMutation } from '../hooks/useMutation'
import { useZodForm } from '../hooks/useZodForm'
import { categoryService } from '../services/categoryService'
import { ENDPOINTS } from '../services/endpoints'
import type { EquipmentCategory } from '../types'
import { cn } from '../utils/cn'

/** Same limits as the backend's EquipmentCategoryCreateRequest. Messages are i18n keys. */
const categorySchema = z.object({
  name: z.string().trim().min(2, 'validation.min2').max(80, 'validation.max80'),
  description: z.string().trim().max(255, 'validation.max255'),
})

type CategoryValues = z.infer<typeof categorySchema>

const EMPTY: CategoryValues = { name: '', description: '' }

/**
 * Admin screen for the catalogue categories: create (POST), rename and describe (PUT replaces the whole
 * category) and delete (DELETE). The route and the backend only allow company admins.
 */
export default function CategoriesPage() {
  const { t } = useTranslation()
  const categories = useFetch<EquipmentCategory[]>(ENDPOINTS.categories)
  const [editing, setEditing] = useState<EquipmentCategory | null>(null)
  const [deleting, setDeleting] = useState<EquipmentCategory | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors },
  } = useZodForm(categorySchema, { defaultValues: EMPTY })

  function startEditing(category: EquipmentCategory | null) {
    setEditing(category)
    reset(category ? { name: category.name, description: category.description ?? '' } : EMPTY)
    if (category) {
      // The form sits above a long list: bring it into view with the name ready to edit.
      window.scrollTo({ top: 0, behavior: 'smooth' })
      // After `reset` has re-rendered the field; focusing in the same tick is lost.
      requestAnimationFrame(() => setFocus('name', { shouldSelect: true }))
    }
  }

  const save = useMutation(
    (values: CategoryValues) => {
      const request = { name: values.name, description: values.description || undefined }
      return editing ? categoryService.replace(editing.id, request) : categoryService.create(request)
    },
    {
      successMessage: (category) =>
        editing ? t('categories.updated', { name: category.name }) : t('categories.created', { name: category.name }),
      errorTitle: t('categories.saveFailed'),
      onSuccess: () => {
        startEditing(null)
        categories.refetch()
      },
    },
  )

  const remove = useMutation((category: EquipmentCategory) => categoryService.remove(category.id), {
    successMessage: t('categories.deleted'),
    errorTitle: t('categories.deleteFailed'),
    onSuccess: () => {
      if (editing?.id === deleting?.id) startEditing(null)
      setDeleting(null)
      categories.refetch()
    },
  })

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <PageHeader
        title={t('categories.title')}
        description={t('categories.description')}
        breadcrumbs={[{ label: t('categories.title') }]}
      />

      <form
        onSubmit={handleSubmit((values) => void save.mutate(values))}
        className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:grid-cols-[1fr_1.5fr_auto] sm:items-start"
        noValidate
      >
        <Input label={t('categories.name')} required placeholder={t('categories.namePlaceholder')} error={errors.name?.message} {...register('name')} />
        <Input label={t('categories.descriptionLabel')} hint={t('categories.optional')} error={errors.description?.message} {...register('description')} />
        <div className="flex gap-2 sm:pt-6">
          {editing && (
            <Button type="button" variant="secondary" onClick={() => startEditing(null)}>
              {t('categories.cancel')}
            </Button>
          )}
          <Button type="submit" isLoading={save.isLoading} leftIcon={editing ? <Save className="size-4" /> : <Plus className="size-4" />}>
            {editing ? t('categories.save') : t('categories.create')}
          </Button>
        </div>
      </form>

      {categories.error && <ErrorState error={categories.error} onRetry={categories.refetch} />}
      {!categories.error && !categories.data && <SkeletonLoader variant="text" count={5} />}
      {!categories.error && categories.data && categories.data.length === 0 && (
        <EmptyState icon={Tags} title={t('categories.emptyTitle')} description={t('categories.emptyDescription')} />
      )}
      {!categories.error && categories.data && categories.data.length > 0 && (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          {categories.data.map((category) => (
            <li
              key={category.id}
              className={cn('flex items-center gap-4 px-5 py-3', editing?.id === category.id && 'bg-accent-tint')}
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{category.name}</p>
                {category.description && <p className="truncate text-sm text-slate-500">{category.description}</p>}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => startEditing(category)}
                leftIcon={<Pencil className="size-4" />}
                aria-label={t('categories.editOf', { name: category.name })}
              >
                {t('categories.edit')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50"
                onClick={() => setDeleting(category)}
                leftIcon={<Trash2 className="size-4" />}
                aria-label={t('categories.deleteOf', { name: category.name })}
              >
                {t('categories.delete')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={deleting !== null}
        title={t('categories.deleteTitle')}
        message={t('categories.deleteMessage', { name: deleting?.name ?? '' })}
        confirmLabel={t('categories.delete')}
        isLoading={remove.isLoading}
        onConfirm={() => deleting && void remove.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
