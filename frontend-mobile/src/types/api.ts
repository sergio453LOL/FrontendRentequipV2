/** Contracts of the RentEquip REST API, mirroring the backend DTOs (`dtos/request`, `dtos/response`). */

/** `LocalDate`, serialized as `YYYY-MM-DD`. */
export type IsoDate = string
/** `LocalDateTime`, serialized as `YYYY-MM-DDTHH:mm:ss`. */
export type IsoDateTime = string

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export interface FieldValidationError {
  field: string
  rejectedValue: unknown
  message: string
}

export interface ErrorResponse {
  timestamp: IsoDateTime
  status: number
  error: string
  code?: string
  message?: string
  path?: string
  details?: FieldValidationError[]
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR'

export interface LoginRequest {
  email: string
  password: string
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

export interface RegisterRequest {
  company: CompanyCreateRequest
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresInSeconds: number
  userId: number
  email: string
  role: UserRole
  companyId: number
  companyName: string
}

export type TwoFactorChannel = 'EMAIL' | 'SMS'

/** The login stopped at the second step: a code went to `destination` (masked) by `channel`. */
export interface TwoFactorChallenge {
  challengeId: string
  channel: TwoFactorChannel
  destination: string
  expiresInSeconds: number
}

export interface TwoFactorVerifyRequest {
  challengeId: string
  code: string
}

export type AuthUser = Pick<AuthResponse, 'userId' | 'email' | 'role' | 'companyId' | 'companyName'>

export type EquipmentStatus = 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'INACTIVE'

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
}

export interface Equipment extends Omit<EquipmentSummary, 'primaryImageUrl'> {
  description: string | null
  manufactureYear: number | null
  serialNumber: string | null
  specifications: string | null
  weeklyRate: number | null
  securityDeposit: number
  address: string | null
  imageUrls: string[]
  categories: string[]
  createdAt: IsoDateTime
}

export interface EquipmentRating {
  equipmentId: number
  averageRating: number
}

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED'
export type ReservationRole = 'RENTER' | 'OWNER'
export type ReservationPaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED'

export interface Reservation {
  id: number
  equipmentId: number
  equipmentName: string
  renterCompanyId: number
  renterCompanyName: string
  startDate: IsoDate
  endDate: IsoDate
  totalDays: number
  dailyRate: number
  rentalAmount: number
  securityDeposit: number
  totalAmount: number
  currency: string
  status: ReservationStatus
  notes: string | null
  paymentStatus: ReservationPaymentStatus
  createdAt: IsoDateTime
}

export interface ReservationCreateRequest {
  equipmentId: number
  startDate: IsoDate
  endDate: IsoDate
  notes?: string
}

export interface Availability {
  equipmentId: number
  startDate: IsoDate
  endDate: IsoDate
  available: boolean
}

export type HandoverStage = 'DELIVERY' | 'RETURN'

export interface HandoverPhoto {
  id: number
  reservationId: number
  stage: HandoverStage
  imageUrl: string
  latitude: number | null
  longitude: number | null
  note: string | null
  uploadedByCompanyId: number
  uploadedByCompanyName: string
  createdAt: IsoDateTime
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
}

/** PATCH body: only the fields that change. The serial number and the owner cannot change. */
export type EquipmentUpdateRequest = Partial<
  Omit<EquipmentCreateRequest, 'serialNumber' | 'ownerCompanyId'> & { status: EquipmentStatus }
>

export interface UploadedImage {
  url: string
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

export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
export type PaymentType = 'RENTAL' | 'SECURITY_DEPOSIT' | 'REFUND'

export interface Payment {
  id: number
  reservationId: number
  amount: number
  currency: string
  type: PaymentType
  status: PaymentStatus
  providerReference: string | null
  paidAt: IsoDateTime | null
  failureReason: string | null
  createdAt: IsoDateTime
}

export type ReceiptChannel = 'EMAIL' | 'WHATSAPP' | 'SMS'

export interface ReceiptDelivery {
  channel: ReceiptChannel
  /** Partially masked, e.g. s***@gmail.com or +51 9•• ••• 321. */
  destination: string
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AssistantChatResponse {
  reply: string
  recommendations: EquipmentSummary[]
  /**
   * `gemini` or `claude` when a language model answered, `catalog-search` for the offline recommender,
   * `guardrail` when the backend answered locally (greeting, off-topic or spam) without calling a model.
   */
  source: 'gemini' | 'claude' | 'catalog-search' | 'guardrail'
}
