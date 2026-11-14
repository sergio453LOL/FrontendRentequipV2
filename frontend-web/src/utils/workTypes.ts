import { Forklift, Hammer, Layers, Shovel, type LucideIcon } from 'lucide-react'
import type { EquipmentCategory } from '../types'

export type WorkType = 'earthworks' | 'lifting' | 'compaction' | 'manual'

/**
 * The renter thinks in jobs, the catalogue in machine families. Each type of work groups the categories
 * that do it (names as the backend stores them); its label lives in i18n `workTypes.<id>`.
 */
export const WORK_TYPES: readonly { id: WorkType; icon: LucideIcon; categories: readonly string[] }[] = [
  { id: 'earthworks', icon: Shovel, categories: ['Excavadoras', 'Retroexcavadoras', 'Minicargadores'] },
  { id: 'lifting', icon: Forklift, categories: ['Elevación', 'Andamios'] },
  { id: 'compaction', icon: Layers, categories: ['Compactación', 'Concreto'] },
  { id: 'manual', icon: Hammer, categories: ['Herramientas', 'Herramientas eléctricas', 'Demolición', 'Generadores'] },
]

export function isWorkType(value: string): value is WorkType {
  return WORK_TYPES.some((type) => type.id === value)
}

/** Ids of the catalogue's categories that belong to a type of work. */
export function categoryIdsFor(workType: WorkType, categories: EquipmentCategory[]): number[] {
  const names = WORK_TYPES.find((type) => type.id === workType)?.categories ?? []
  return categories.filter((category) => names.includes(category.name)).map((category) => category.id)
}
