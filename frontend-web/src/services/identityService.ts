import type { RucType } from '../utils/ruc'
import { api } from './api'

export interface RucInfo {
  ruc: string
  name: string | null
  state: string | null
  condition: string | null
  address: string | null
  district: string | null
  province: string | null
  department: string | null
  type: RucType
}

export interface DniInfo {
  dni: string
  firstNames: string | null
  lastNames: string | null
  fullName: string | null
}

/** SUNAT (RUC) and RENIEC (DNI) lookups that fill in the registration form. */
export const identityService = {
  async ruc(ruc: string): Promise<RucInfo> {
    const { data } = await api.get<RucInfo>(`/identity/ruc/${ruc}`)
    return data
  },

  async dni(dni: string): Promise<DniInfo> {
    const { data } = await api.get<DniInfo>(`/identity/dni/${dni}`)
    return data
  },
}
