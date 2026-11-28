import type {
  AssistantChatResponse,
  AuthResponse,
  Availability,
  ChatTurn,
  CompanyDashboard,
  Equipment,
  EquipmentCategory,
  EquipmentCategoryRequest,
  EquipmentCreateRequest,
  EquipmentRating,
  EquipmentSummary,
  EquipmentUpdateRequest,
  HandoverPhoto,
  HandoverStage,
  LoginRequest,
  PageResponse,
  Payment,
  ReceiptChannel,
  ReceiptDelivery,
  RegisterRequest,
  TwoFactorChallenge,
  TwoFactorVerifyRequest,
  Reservation,
  ReservationCreateRequest,
  ReservationRole,
  ReservationStatus,
  UploadedImage,
  AppNotification,
  BlockedWindow,
  OfferCreateRequest,
  OfferReplyRequest,
  PriceOffer,
  Review,
  ReviewCreateRequest,
  UserProfile,
  PurchaseQuote,
  PurchaseRequest,
} from '../types/api'
import { ApiError } from '../utils/apiError'
import { api } from './api'

export const authService = {
  /** 200 brings the tokens; 202 means the account has the two-step verification on and a code was sent. */
  async login(request: LoginRequest): Promise<AuthResponse | TwoFactorChallenge> {
    return (await api.post<AuthResponse | TwoFactorChallenge>('/auth/login', request)).data
  },
  async verifyLogin(request: TwoFactorVerifyRequest): Promise<AuthResponse> {
    return (await api.post<AuthResponse>('/auth/login/verify', request)).data
  },
  async register(request: RegisterRequest): Promise<AuthResponse> {
    return (await api.post<AuthResponse>('/auth/register', request)).data
  },
  /** One-click demo: tokens of the shared demo renter, no password (404 when the server has it closed). */
  async demo(): Promise<AuthResponse> {
    return (await api.post<AuthResponse>('/auth/demo')).data
  },
}

export const userService = {
  async me(signal?: AbortSignal): Promise<UserProfile> {
    return (await api.get<UserProfile>('/users/me', { signal })).data
  },
}

export const reviewService = {
  async listForEquipment(equipmentId: number, signal?: AbortSignal): Promise<PageResponse<Review>> {
    return (await api.get<PageResponse<Review>>(`/equipment/${equipmentId}/reviews`, { params: { page: 0, size: 10 }, signal }))
      .data
  },
  /** The review left for a reservation, or null when there is none yet. */
  async findByReservation(reservationId: number, signal?: AbortSignal): Promise<Review | null> {
    try {
      return (await api.get<Review>('/reviews', { params: { reservationId }, signal })).data
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null
      throw error
    }
  },
  async create(request: ReviewCreateRequest): Promise<Review> {
    return (await api.post<Review>('/reviews', request)).data
  },
}

export const offerService = {
  async create(request: OfferCreateRequest): Promise<PriceOffer> {
    return (await api.post<PriceOffer>('/offers', request)).data
  },
  async list(role: ReservationRole, page: number, signal?: AbortSignal): Promise<PageResponse<PriceOffer>> {
    return (await api.get<PageResponse<PriceOffer>>('/offers', { params: { role, page, size: 10 }, signal })).data
  },
  async accept(id: number, reply?: OfferReplyRequest): Promise<PriceOffer> {
    return (await api.post<PriceOffer>(`/offers/${id}/acceptance`, reply ?? {})).data
  },
  async reject(id: number, reply?: OfferReplyRequest): Promise<PriceOffer> {
    return (await api.post<PriceOffer>(`/offers/${id}/rejection`, reply ?? {})).data
  },
  async counter(id: number, reply: OfferReplyRequest): Promise<PriceOffer> {
    return (await api.post<PriceOffer>(`/offers/${id}/counter`, reply)).data
  },
  async cancel(id: number): Promise<PriceOffer> {
    return (await api.post<PriceOffer>(`/offers/${id}/cancellation`)).data
  },
}

export const notificationService = {
  async list(page: number, signal?: AbortSignal): Promise<PageResponse<AppNotification>> {
    return (await api.get<PageResponse<AppNotification>>('/notifications', { params: { page, size: 20 }, signal })).data
  },
  async unreadCount(signal?: AbortSignal): Promise<number> {
    return (await api.get<{ unread: number }>('/notifications/unread-count', { signal })).data.unread ?? 0
  },
  async markRead(id: number): Promise<void> {
    await api.patch(`/notifications/${id}/read`)
  },
  async markAllRead(): Promise<void> {
    await api.post('/notifications/read-all')
  },
}

export interface EquipmentSearchParams {
  latitude?: number
  longitude?: number
  radiusKm?: number
  q?: string
  categoryId?: number
  excludeOwnerId?: number
  page: number
  size: number
}

export const equipmentService = {
  async search(params: EquipmentSearchParams, signal?: AbortSignal): Promise<PageResponse<EquipmentSummary>> {
    return (await api.get<PageResponse<EquipmentSummary>>('/equipment/search', { params, signal })).data
  },
  async findById(id: number, signal?: AbortSignal): Promise<Equipment> {
    return (await api.get<Equipment>(`/equipment/${id}`, { signal })).data
  },
  /** Stretches already taken in the next months, to propose the first free dates. */
  async blockedDates(equipmentId: number, from: string, until: string, signal?: AbortSignal): Promise<BlockedWindow[]> {
    return (await api.get<BlockedWindow[]>(`/equipment/${equipmentId}/blocked-dates`, { params: { from, until }, signal })).data
  },
  async rating(equipmentId: number, signal?: AbortSignal): Promise<EquipmentRating> {
    return (await api.get<EquipmentRating>('/reviews/ratings', { params: { equipmentId }, signal })).data
  },
  /** The company's own fleet, newest first. */
  async listByCompany(
    companyId: number,
    params: { page: number; size: number },
    signal?: AbortSignal,
  ): Promise<PageResponse<EquipmentSummary>> {
    return (await api.get<PageResponse<EquipmentSummary>>(`/companies/${companyId}/equipment`, { params, signal })).data
  },
  async create(request: EquipmentCreateRequest): Promise<Equipment> {
    return (await api.post<Equipment>('/equipment', request)).data
  },
  /** Partial update: only the fields sent change (PATCH). */
  async update(id: number, changes: EquipmentUpdateRequest): Promise<Equipment> {
    return (await api.patch<Equipment>(`/equipment/${id}`, changes)).data
  },
  /** The backend refuses it while the machine has pending or active reservations. */
  async remove(id: number): Promise<void> {
    await api.delete(`/equipment/${id}`)
  },
  /** Uploads one listing photo and resolves with its public URL. */
  async uploadImage(photo: PhotoUpload, onProgress?: (percent: number) => void): Promise<string> {
    const form = new FormData()
    form.append('file', toFormFile(photo, 'equipment') as unknown as Blob)
    const { data } = await api.post<UploadedImage>('/uploads/images', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: PHOTO_UPLOAD_TIMEOUT_MS,
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100))
      },
    })
    return data.url
  },
}

/** Categories are public to read; creating, renaming (PUT) and deleting them is for company admins. */
export const categoryService = {
  async list(signal?: AbortSignal): Promise<EquipmentCategory[]> {
    return (await api.get<EquipmentCategory[]>('/equipment-categories', { signal })).data
  },
  async create(request: EquipmentCategoryRequest): Promise<EquipmentCategory> {
    return (await api.post<EquipmentCategory>('/equipment-categories', request)).data
  },
  /** Replaces the whole category (name and description), hence PUT rather than PATCH. */
  async replace(id: number, request: EquipmentCategoryRequest): Promise<EquipmentCategory> {
    return (await api.put<EquipmentCategory>(`/equipment-categories/${id}`, request)).data
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/equipment-categories/${id}`)
  },
}

export const companyService = {
  async dashboard(signal?: AbortSignal): Promise<CompanyDashboard> {
    return (await api.get<CompanyDashboard>('/companies/me/dashboard', { signal })).data
  },
}

/** The backend makes several calls to Stripe per checkout, so the default timeout is too tight. */
const PAYMENT_TIMEOUT_MS = 45_000

export const paymentService = {
  /** Captures the rental and holds the security deposit. Resolves with both payment records. */
  async pay(reservationId: number, paymentToken: string): Promise<Payment[]> {
    return (
      await api.post<Payment[]>(`/reservations/${reservationId}/payments`, { paymentToken }, { timeout: PAYMENT_TIMEOUT_MS })
    ).data
  },
  async list(reservationId: number, signal?: AbortSignal): Promise<Payment[]> {
    return (await api.get<Payment[]>(`/reservations/${reservationId}/payments`, { signal })).data
  },
}

/** The language model can take a while on the first question; give it more room than a normal request. */
const ASSISTANT_TIMEOUT_MS = 60_000
/** The backend only passes the last 6 turns to the model; sending more just makes the request bigger. */
const MAX_HISTORY_TURNS = 6

export const assistantService = {
  async chat(history: ChatTurn[]): Promise<AssistantChatResponse> {
    const messages = history.slice(-MAX_HISTORY_TURNS)
    return (await api.post<AssistantChatResponse>('/assistant/chat', { messages }, { timeout: ASSISTANT_TIMEOUT_MS })).data
  },
}

export const reservationService = {
  async list(
    params: { role: ReservationRole; status?: ReservationStatus; page: number; size: number },
    signal?: AbortSignal,
  ): Promise<PageResponse<Reservation>> {
    return (await api.get<PageResponse<Reservation>>('/reservations', { params, signal })).data
  },
  async findById(id: number, signal?: AbortSignal): Promise<Reservation> {
    return (await api.get<Reservation>(`/reservations/${id}`, { signal })).data
  },
  async availability(equipmentId: number, startDate: string, endDate: string, signal?: AbortSignal): Promise<Availability> {
    return (await api.get<Availability>('/reservations/availability', { params: { equipmentId, startDate, endDate }, signal }))
      .data
  },
  async create(request: ReservationCreateRequest): Promise<Reservation> {
    return (await api.post<Reservation>('/reservations', request)).data
  },
  async confirm(id: number): Promise<Reservation> {
    return (await api.post<Reservation>(`/reservations/${id}/confirmation`)).data
  },
  async cancel(id: number, reason?: string): Promise<Reservation> {
    return (await api.post<Reservation>(`/reservations/${id}/cancellation`, null, { params: { reason } })).data
  },
  async updateStatus(id: number, status: ReservationStatus, reason?: string): Promise<Reservation> {
    return (await api.patch<Reservation>(`/reservations/${id}/status`, { status, reason })).data
  },
  /** Re-sends the receipt of a paid reservation to the user's registered email or WhatsApp. */
  async sendReceipt(id: number, channel: ReceiptChannel): Promise<ReceiptDelivery> {
    return (await api.post<ReceiptDelivery>(`/reservations/${id}/receipt-deliveries`, { channel })).data
  },
}

export interface PhotoUpload {
  uri: string
  mimeType?: string | null
  fileName?: string | null
}

const PHOTO_UPLOAD_TIMEOUT_MS = 60_000

/** React Native's FormData takes a { uri, name, type } descriptor and streams the file from disk. */
function toFormFile(photo: PhotoUpload, prefix: string) {
  return {
    uri: photo.uri,
    name: photo.fileName ?? `${prefix}-${Date.now()}.jpg`,
    type: photo.mimeType ?? 'image/jpeg',
  }
}

export const handoverService = {
  async list(reservationId: number, signal?: AbortSignal): Promise<HandoverPhoto[]> {
    return (await api.get<HandoverPhoto[]>(`/reservations/${reservationId}/handover-photos`, { signal })).data
  },

  async upload(
    reservationId: number,
    photo: PhotoUpload,
    details: { stage: HandoverStage; latitude?: number; longitude?: number; note?: string },
    onProgress?: (percent: number) => void,
  ): Promise<HandoverPhoto> {
    const form = new FormData()
    form.append('file', toFormFile(photo, 'handover') as unknown as Blob)
    form.append('stage', details.stage)
    if (details.latitude !== undefined && details.longitude !== undefined) {
      form.append('latitude', details.latitude.toFixed(7))
      form.append('longitude', details.longitude.toFixed(7))
    }
    if (details.note) form.append('note', details.note)

    const { data } = await api.post<HandoverPhoto>(`/reservations/${reservationId}/handover-photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: PHOTO_UPLOAD_TIMEOUT_MS,
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100))
      },
    })
    return data
  },
}

/** Buying a rented machine: quote from the reservation, request, the owner's answer and the payment. */
export const purchaseService = {
  async quote(reservationId: number, signal?: AbortSignal): Promise<PurchaseQuote> {
    return (await api.get<PurchaseQuote>(`/reservations/${reservationId}/purchase-quote`, { signal })).data
  },
  async request(reservationId: number): Promise<PurchaseRequest> {
    return (await api.post<PurchaseRequest>(`/reservations/${reservationId}/purchase-requests`)).data
  },
  async list(role: ReservationRole, page: number, signal?: AbortSignal): Promise<PageResponse<PurchaseRequest>> {
    return (await api.get<PageResponse<PurchaseRequest>>('/purchase-requests', { params: { role, page, size: 10 }, signal })).data
  },
  async accept(id: number): Promise<PurchaseRequest> {
    return (await api.post<PurchaseRequest>(`/purchase-requests/${id}/acceptance`)).data
  },
  async reject(id: number): Promise<PurchaseRequest> {
    return (await api.post<PurchaseRequest>(`/purchase-requests/${id}/rejection`)).data
  },
  async cancel(id: number): Promise<PurchaseRequest> {
    return (await api.post<PurchaseRequest>(`/purchase-requests/${id}/cancellation`)).data
  },
  async pay(id: number, paymentToken: string): Promise<PurchaseRequest> {
    return (
      await api.post<PurchaseRequest>(`/purchase-requests/${id}/payment`, { paymentToken }, { timeout: PAYMENT_TIMEOUT_MS })
    ).data
  },
}
