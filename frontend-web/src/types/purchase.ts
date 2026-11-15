import type { IsoDateTime } from './common'

export type PurchaseStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'PAID'

/** Why a renter cannot buy from a reservation right now. */
export type PurchaseIneligibility = 'NOT_FOR_SALE' | 'SOLD' | 'RESERVATION_STATUS'

/** What buying the rented machine costs now: list price minus the share of the rent already paid. */
export interface PurchaseQuote {
  eligible: boolean
  reason: PurchaseIneligibility | null
  listPrice: number | null
  rentPaid: number
  rentCreditPercent: number
  rentCredit: number
  finalPrice: number | null
  currency: string
  /** A request already waiting for the owner or for payment. */
  openRequestId: number | null
}

export interface PurchaseRequest {
  id: number
  reservationId: number
  equipmentId: number
  equipmentName: string
  equipmentImageUrl: string | null
  buyerCompanyId: number
  buyerCompanyName: string
  sellerCompanyId: number
  sellerCompanyName: string
  listPrice: number
  rentCredit: number
  finalPrice: number
  currency: string
  status: PurchaseStatus
  createdAt: IsoDateTime
  decidedAt: IsoDateTime | null
  paidAt: IsoDateTime | null
}

export interface EquipmentSaleRequest {
  /** Null takes the machine off sale. */
  salePrice: number | null
  rentCreditPercent: number
}
