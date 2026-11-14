import type { EquipmentCategory, EquipmentCategoryRequest } from '../types'
import { api } from './api'
import { ENDPOINTS } from './endpoints'

/** Catalogue categories. Reading is public; creating, renaming and deleting is for company admins. */
export const categoryService = {
  async create(request: EquipmentCategoryRequest): Promise<EquipmentCategory> {
    const { data } = await api.post<EquipmentCategory>(ENDPOINTS.categories, request)
    return data
  },

  /** Replaces the whole category (name and description), hence PUT rather than PATCH. */
  async replace(id: number, request: EquipmentCategoryRequest): Promise<EquipmentCategory> {
    const { data } = await api.put<EquipmentCategory>(ENDPOINTS.category(id), request)
    return data
  },

  /** The backend refuses it (409) while any equipment still uses the category. */
  async remove(id: number): Promise<void> {
    await api.delete(ENDPOINTS.category(id))
  },
}
