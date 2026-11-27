import { MOCK_FLEET } from '../data/adminMockData'
import type { AdminCatalog, AdminEquipment, AdminWorkType, EquipmentCategory, EquipmentSummary, FleetAvailability, PageResponse } from '../types'
import { WORK_TYPES } from '../utils/workTypes'
import { api } from './api'
import { ENDPOINTS } from './endpoints'

const PAGE_SIZE = 100
const MAX_PAGES = 4

/** Every machine the public search returns (the backend caps a page at 100), optionally for some categories. */
export async function fetchCatalogPages(params: Record<string, unknown> = {}): Promise<EquipmentSummary[]> {
  const items: EquipmentSummary[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data } = await api.get<PageResponse<EquipmentSummary>>(ENDPOINTS.equipmentSearch, {
      params: { ...params, page, size: PAGE_SIZE, sort: 'NEWEST' },
    })
    items.push(...data.content)
    if (data.last) break
  }
  return items
}

const AVAILABILITY: Record<EquipmentSummary['status'], FleetAvailability> = {
  AVAILABLE: 'AVAILABLE',
  RENTED: 'ON_SITE',
  MAINTENANCE: 'MAINTENANCE',
  INACTIVE: 'AVAILABLE',
  SOLD: 'AVAILABLE',
}

function toAdminEquipment(item: EquipmentSummary, workType: AdminWorkType): AdminEquipment {
  return {
    key: `api-eq-${item.id}`,
    backendId: item.id,
    source: 'api',
    name: item.name,
    brand: item.brand,
    model: item.model,
    workType,
    owner: item.ownerCompanyName,
    city: item.city,
    dailyRate: item.dailyRate,
    year: item.manufactureYear,
    imageUrl: item.primaryImageUrl,
    published: item.status !== 'INACTIVE',
    // Neither flag exists in the backend yet: real machines start without them.
    featured: false,
    aiSuggested: false,
    availability: AVAILABILITY[item.status],
  }
}

/**
 * The platform's whole fleet: the machines the backend lists, each placed in its family of work by asking
 * the search once per family, followed by the demonstration fleet. Publishing, hiding and editing rates of
 * other companies' machines has no platform endpoint yet, so those changes stay in the screen.
 */
export const adminCatalogService = {
  async list(): Promise<AdminCatalog> {
    try {
      const { data: categories } = await api.get<EquipmentCategory[]>(ENDPOINTS.categories)
      const families = await Promise.all(
        WORK_TYPES.map(async (type) => {
          const ids = categories.filter((category) => type.categories.includes(category.name)).map((category) => category.id)
          return { type: type.id, items: ids.length ? await fetchCatalogPages({ categoryIds: ids.join(',') }) : [] }
        }),
      )
      const seen = new Set<number>()
      const real: AdminEquipment[] = []
      for (const family of families) {
        for (const item of family.items) {
          if (seen.has(item.id)) continue
          seen.add(item.id)
          real.push(toAdminEquipment(item, family.type))
        }
      }
      return { items: [...real, ...MOCK_FLEET.map((item) => ({ ...item }))], apiCount: real.length, apiFailed: false }
    } catch {
      return { items: MOCK_FLEET.map((item) => ({ ...item })), apiCount: 0, apiFailed: true }
    }
  },
}
