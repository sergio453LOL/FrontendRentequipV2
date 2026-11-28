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
  ownerCompanyVerified: boolean
  /** The daily rate includes someone to run the machine. */
  operatorIncluded: boolean
  operator: OperatorProfile | null
  /** Set when the owner also sells it; null when it is only for rent. */
  salePrice: number | null
  usageHours: number | null
  /** A YouTube (or other) video of the machine working. */
  videoUrl: string | null
  /** Usage and safety instructions as a PDF. */
  manualUrl: string | null
}

export interface OperatorProfile {
  name: string
  license: string | null
  experienceYears: number | null
  /** One certification per line. */
  certifications: string | null
}

/** A stretch the machine is already taken (pending, confirmed or in progress). */
export interface BlockedWindow {
  startDate: IsoDate
  endDate: IsoDate
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
  /** An accepted price offer: the reservation is made at its agreed rate. */
  offerId?: number
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

/** What /users/me says about the signed-in user; only the fields the app reads. */
export interface UserProfile {
  id: number
  email: string
  /** The shared one-click demo account: some changes are blocked and the payment step takes test cards. */
  demoAccount: boolean
}

export interface Review {
  id: number
  reservationId: number
  equipmentId: number
  reviewerCompanyId: number
  reviewerCompanyName: string
  rating: number
  conditionRating: number | null
  comment: string | null
  createdAt: IsoDateTime
}

export interface ReviewCreateRequest {
  reservationId: number
  rating: number
  conditionRating?: number
  comment?: string
}

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

/** An alert in the company's inbox. */
export interface AppNotification {
  id: number
  type: string
  title: string
  message: string
  /** Web path of the related screen (e.g. /reservations/12); the app maps the ones it has. */
  link: string | null
  read: boolean
  createdAt: IsoDateTime
}

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
