import type { IsoDate, IsoDateTime, PageParams } from './common'

export type EquipmentStatus = 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'INACTIVE' | 'SOLD'

export interface Equipment {
  id: number
  name: string
  description: string | null
  brand: string
  model: string
  manufactureYear: number | null
  serialNumber: string | null
  specifications: string | null
  dailyRate: number
  weeklyRate: number | null
  securityDeposit: number
  currency: string
  status: EquipmentStatus
  address: string | null
  city: string
  latitude: number
  longitude: number
  imageUrls: string[]
  categories: string[]
  ownerCompanyId: number
  ownerCompanyName: string
  ownerCompanyLogoUrl: string | null
  ownerCompanyDescription: string | null
  createdAt: IsoDateTime
  /** The rate includes a qualified operator. */
  operatorIncluded: boolean
  /** Price to buy it outright; null when it is only for rent. */
  salePrice: number | null
  /** Share of the rent already paid that comes off the sale price (0-100). */
  rentCreditPercent: number
}

/** Lightweight projection used by search results and map pins. */
export interface EquipmentSummary {
  id: number
  name: string
  brand: string
  model: string
  dailyRate: number
  currency: string
  status: EquipmentStatus
  city: string
  latitude: number
  longitude: number
  primaryImageUrl: string | null
  ownerCompanyId: number
  ownerCompanyName: string
  operatorIncluded: boolean
  /** Null when it is only for rent. */
  salePrice: number | null
}

export interface EquipmentCreateRequest {
  name: string
  description?: string
  brand: string
  model: string
  manufactureYear?: number
  serialNumber?: string
  specifications?: string
  dailyRate: number
  weeklyRate?: number
  securityDeposit: number
  currency?: string
  address?: string
  city: string
  latitude: number
  longitude: number
  imageUrls?: string[]
  categoryIds: number[]
  ownerCompanyId: number
  operatorIncluded?: boolean
}

export type EquipmentUpdateRequest = Partial<
  Omit<EquipmentCreateRequest, 'serialNumber' | 'ownerCompanyId'> & { status: EquipmentStatus }
>

export interface EquipmentSearchParams extends PageParams {
  latitude?: number
  longitude?: number
  radiusKm?: number
  categoryId?: number
  /** Matches any of these categories (the type-of-work filter). */
  categoryIds?: number[]
  city?: string
  maxDailyRate?: number
  startDate?: IsoDate
  endDate?: IsoDate
  excludeOwnerId?: number
}

export interface EquipmentCategory {
  id: number
  name: string
  description: string | null
}

export interface EquipmentCategoryRequest {
  name: string
  description?: string
}

export interface EquipmentRating {
  equipmentId: number
  averageRating: number
  reviewCount: number
}
