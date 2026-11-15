import type { IsoDate, IsoDateTime } from './common'

export type OfferStatus = 'PENDING' | 'COUNTERED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'USED'

/** A price negotiation on a machine's daily rate, seen from either side. */
export interface PriceOffer {
  id: number
  equipmentId: number
  equipmentName: string
  equipmentImageUrl: string | null
  ownerCompanyId: number
  ownerCompanyName: string
  renterCompanyId: number
  renterCompanyName: string
  listDailyRate: number
  proposedDailyRate: number
  counterDailyRate: number | null
  agreedDailyRate: number | null
  currency: string
  startDate: IsoDate | null
  endDate: IsoDate | null
  renterMessage: string | null
  ownerMessage: string | null
  status: OfferStatus
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export interface OfferCreateRequest {
  equipmentId: number
  dailyRate: number
  startDate?: IsoDate
  endDate?: IsoDate
  message?: string
}

export interface OfferReplyRequest {
  dailyRate?: number
  message?: string
}
