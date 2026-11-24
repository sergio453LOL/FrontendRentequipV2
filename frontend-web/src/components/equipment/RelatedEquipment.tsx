import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useFetch } from '../../hooks/useFetch'
import { PATHS } from '../../routes/paths'
import { ENDPOINTS } from '../../services/endpoints'
import type { Equipment, EquipmentCategory, EquipmentSummary, PageResponse } from '../../types'
import { EquipmentCard } from './EquipmentCard'

/** How many related machines the strip shows: one row of the catalogue grid. */
const SHOWN = 4

/**
 * Other machines of the same families as the one on screen, nearest to it first, so a renter who finds it
 * taken, too far or too small has the next options at hand. Hidden when nothing else matches.
 */
export function RelatedEquipment({ equipment }: { equipment: Equipment }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const categories = useFetch<EquipmentCategory[]>(ENDPOINTS.categories)
  // The detail gives category names; the search takes ids.
  const categoryIds = (categories.data ?? []).filter((category) => equipment.categories.includes(category.name)).map((category) => category.id)
  const related = useFetch<PageResponse<EquipmentSummary>>(categoryIds.length > 0 ? ENDPOINTS.equipmentSearch : null, {
    categoryIds: categoryIds.join(','),
    excludeOwnerId: user?.companyId,
    latitude: equipment.latitude,
    longitude: equipment.longitude,
    radiusKm: 1500,
    sort: 'NEAREST',
    page: 0,
    // One extra, since the machine on screen comes back in its own results.
    size: SHOWN + 1,
  })
  const machines = (related.data?.content ?? []).filter((machine) => machine.id !== equipment.id).slice(0, SHOWN)

  if (machines.length === 0) return null

  return (
    <section aria-labelledby="related-title" className="space-y-4 border-t border-slate-200/80 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="related-title" className="text-lg font-bold text-ink">
            {t('equipment.relatedTitle')}
          </h2>
          <p className="text-sm text-slate-600">{t('equipment.relatedText')}</p>
        </div>
        <Link
          to={`${PATHS.catalog}?categoryId=${categoryIds[0]}`}
          className="group flex items-center gap-1.5 rounded-md text-sm font-semibold text-ink hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {t('equipment.relatedMore')}
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {machines.map((machine) => (
          <li key={machine.id}>
            <EquipmentCard equipment={machine} />
          </li>
        ))}
      </ul>
    </section>
  )
}
