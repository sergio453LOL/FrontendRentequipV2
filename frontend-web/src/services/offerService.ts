import type { OfferCreateRequest, OfferReplyRequest, PriceOffer } from '../types'
import { api } from './api'
import { ENDPOINTS } from './endpoints'

/** Price negotiation: the renter proposes, the owner accepts, rejects or counters. */
export const offerService = {
  async create(request: OfferCreateRequest): Promise<PriceOffer> {
    const { data } = await api.post<PriceOffer>(ENDPOINTS.offers, request)
    return data
  },

  async accept(id: number, reply: OfferReplyRequest = {}): Promise<PriceOffer> {
    const { data } = await api.post<PriceOffer>(ENDPOINTS.offerAction(id, 'acceptance'), reply)
    return data
  },

  async reject(id: number, reply: OfferReplyRequest = {}): Promise<PriceOffer> {
    const { data } = await api.post<PriceOffer>(ENDPOINTS.offerAction(id, 'rejection'), reply)
    return data
  },

  async counter(id: number, reply: OfferReplyRequest): Promise<PriceOffer> {
    const { data } = await api.post<PriceOffer>(ENDPOINTS.offerAction(id, 'counter'), reply)
    return data
  },

  async cancel(id: number): Promise<PriceOffer> {
    const { data } = await api.post<PriceOffer>(ENDPOINTS.offerAction(id, 'cancellation'))
    return data
  },
}
