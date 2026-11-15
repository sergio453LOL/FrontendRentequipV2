import type { Equipment, EquipmentSaleRequest, PurchaseQuote, PurchaseRequest } from '../types'
import { api } from './api'
import { ENDPOINTS } from './endpoints'

/** Rent with an option to buy: sale terms, purchase requests and their payment. */
export const purchaseService = {
  async updateSaleTerms(equipmentId: number, request: EquipmentSaleRequest): Promise<Equipment> {
    const { data } = await api.put<Equipment>(ENDPOINTS.equipmentSale(equipmentId), request)
    return data
  },

  async quote(reservationId: number): Promise<PurchaseQuote> {
    const { data } = await api.get<PurchaseQuote>(ENDPOINTS.purchaseQuote(reservationId))
    return data
  },

  async request(reservationId: number): Promise<PurchaseRequest> {
    const { data } = await api.post<PurchaseRequest>(ENDPOINTS.purchaseRequestsFor(reservationId))
    return data
  },

  async accept(id: number): Promise<PurchaseRequest> {
    const { data } = await api.post<PurchaseRequest>(ENDPOINTS.purchaseAction(id, 'acceptance'))
    return data
  },

  async reject(id: number): Promise<PurchaseRequest> {
    const { data } = await api.post<PurchaseRequest>(ENDPOINTS.purchaseAction(id, 'rejection'))
    return data
  },

  async cancel(id: number): Promise<PurchaseRequest> {
    const { data } = await api.post<PurchaseRequest>(ENDPOINTS.purchaseAction(id, 'cancellation'))
    return data
  },

  async pay(id: number, paymentToken: string): Promise<PurchaseRequest> {
    const { data } = await api.post<PurchaseRequest>(ENDPOINTS.purchaseAction(id, 'payment'), { paymentToken })
    return data
  },
}
