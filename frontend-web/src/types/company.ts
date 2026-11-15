import type { IsoDateTime } from './common'

export interface Company {
  id: number
  name: string
  taxId: string
  email: string
  phone: string | null
  address: string | null
  city: string
  latitude: number
  longitude: number
  /** Public URL of the logo; null shows the initials. */
  logoUrl: string | null
  /** "About us" text shown to renters next to the company's machines. */
  description: string | null
  active: boolean
  createdAt: IsoDateTime
  /** SUNAT reports the RUC as ACTIVO and HABIDO. */
  verified: boolean
  verifiedAt: IsoDateTime | null
  /** SUNAT's last answer, e.g. "ACTIVO / HABIDO"; null until checked. */
  taxStatus: string | null
}

export interface CompanyCreateRequest {
  name: string
  taxId: string
  email: string
  phone?: string
  address?: string
  city: string
  latitude: number
  longitude: number
}

/** Only for ADMIN. An empty string removes the logo or the description. */
export type CompanyUpdateRequest = Partial<Omit<CompanyCreateRequest, 'taxId'>> & {
  logoUrl?: string
  description?: string
}

export interface CompanyDashboard {
  companyId: number
  publishedEquipment: number
  activeReservationsAsOwner: number
  pendingRequestsAsOwner: number
  activeReservationsAsRenter: number
  estimatedRevenue: number
  currency: string
}
