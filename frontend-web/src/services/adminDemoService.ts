import { api } from './api'
import { ENDPOINTS } from './endpoints'

/** What a reset of the shared demo account cancelled. */
export interface DemoResetResult {
  reservations: number
  offers: number
  purchases: number
}

/** Platform panel: upkeep of the "Probar la demo" account (real backend endpoint, platform admins only). */
export const adminDemoService = {
  async reset(): Promise<DemoResetResult> {
    const { data } = await api.post<DemoResetResult>(ENDPOINTS.adminDemoReset)
    return data
  },
}
