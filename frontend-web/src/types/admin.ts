import type { IsoDate, IsoDateTime } from './common'

/**
 * Platform panel (`/admin`): what the marketplace operator sees across every company. Rows read from the
 * backend carry `source: 'api'`; rows from `data/adminMockData.ts` carry `source: 'demo'`, so the screens
 * can mark them and keep their actions local.
 */
export type AdminDataSource = 'api' | 'demo'

/** The four families of work the dashboard and the catalogue group machines by (i18n `admin.workTypes`). */
export type AdminWorkType = 'earthworks' | 'lifting' | 'compaction' | 'manual'

export type AdminCity = 'Lima' | 'Callao' | 'Arequipa' | 'Trujillo' | 'Piura' | 'Cusco' | 'Chiclayo' | 'Huancayo' | 'Ica'

// --- Companies (KYB) ---

export type KybStatus = 'VERIFIED' | 'IN_REVIEW' | 'SUSPENDED'

/** Which side of the marketplace the company works on. */
export type CompanySide = 'RENTER' | 'OWNER' | 'BOTH'

export type KybDocumentKind = 'RUC_RECORD' | 'POWER_OF_ATTORNEY' | 'REPRESENTATIVE_ID' | 'SCTR_POLICY'

export type KybDocumentStatus = 'APPROVED' | 'PENDING' | 'MISSING' | 'REJECTED'

export interface KybDocument {
  kind: KybDocumentKind
  status: KybDocumentStatus
  uploadedAt: IsoDate | null
}

export interface CompanyRepresentative {
  name: string
  email: string
  phone: string | null
}

export interface CompanyRentalRecord {
  code: string
  equipment: string
  city: AdminCity | string
  startDate: IsoDate
  endDate: IsoDate
  amount: number
  /** The company rented the machine in (RENTER) or rented its own out (OWNER). */
  role: 'RENTER' | 'OWNER'
}

export interface AdminCompany {
  /** Unique across both sources: `api-12`, `demo-3`. */
  key: string
  /** Id in the backend; null for demonstration rows. */
  backendId: number | null
  source: AdminDataSource
  name: string
  ruc: string
  city: string
  side: CompanySide
  status: KybStatus
  /** SUNAT's last answer ("ACTIVO / HABIDO"); null until checked. */
  taxStatus: string | null
  /** Null until loaded (backend rows load it when the drawer opens). */
  representative: CompanyRepresentative | null
  createdAt: IsoDate
  documents: KybDocument[]
  history: CompanyRentalRecord[]
  /** Average of the reviews it received, 1-5; null without reviews. */
  rating: number | null
  reviewCount: number
  equipmentCount: number
}

// --- Dashboard ---

export type AdminKpiId = 'gmv' | 'activeRentals' | 'verifiedCompanies' | 'aiConversion'

export interface AdminKpi {
  id: AdminKpiId
  value: number
  /** Same metric one period earlier: the change is computed from both. */
  previous: number
  unit: 'PEN' | 'count' | 'percent'
  /** Last 12 points, oldest first, ending on `value`. */
  series: number[]
}

/** Rentals started that day, by family of work. */
export interface DailyRentals {
  date: IsoDate
  earthworks: number
  lifting: number
  compaction: number
  manual: number
}

export type LiveBookingStage = 'REQUESTED' | 'PAID' | 'ON_SITE'

export interface LiveBooking {
  id: string
  company: string
  equipment: string
  city: AdminCity
  amount: number
  days: number
  stage: LiveBookingStage
  at: IsoDateTime
}

export type AdminAlertKind = 'KYB_PENDING' | 'ABANDONED_QUOTES' | 'DEMAND_GAP' | 'PAYOUT_ON_HOLD'

export interface AdminAlert {
  kind: AdminAlertKind
  count: number
  /** Money at stake, in soles, when the alert is about money. */
  amount: number | null
  /** Extra word for the copy: a city, a threshold. */
  detail: string | null
}

export interface AdminDashboard {
  kpis: AdminKpi[]
  dailyRentals: DailyRentals[]
  liveBookings: LiveBooking[]
  alerts: AdminAlert[]
}

// --- Movements and audit ---

export type AuditEventType =
  | 'RESERVATION_CREATED'
  | 'ESCROW_PAYMENT'
  | 'AI_QUERY'
  | 'EQUIPMENT_PUBLISHED'
  | 'STATUS_CHANGED'
  | 'REVIEW'
  | 'LOGIN'

export interface AuditEvent {
  id: string
  type: AuditEventType
  at: IsoDateTime
  company: string
  actor: string
  /** What happened, in the platform's words (data, not UI copy). */
  detail: string
  amount: number | null
  ip: string
}

// --- Catalogue ---

export type FleetAvailability = 'ON_SITE' | 'AVAILABLE' | 'MAINTENANCE'

export interface AdminEquipment {
  key: string
  backendId: number | null
  source: AdminDataSource
  name: string
  brand: string
  model: string
  workType: AdminWorkType
  owner: string
  city: string
  dailyRate: number
  year: number | null
  imageUrl: string | null
  published: boolean
  featured: boolean
  aiSuggested: boolean
  availability: FleetAvailability
}

export interface AdminCatalog {
  items: AdminEquipment[]
  /** Machines the backend reported; 0 when it could not be read. */
  apiCount: number
  apiFailed: boolean
}

// --- Marketing ---

export type CampaignStatus = 'SENT' | 'SCHEDULED' | 'DRAFT'

export type CampaignSegment = 'RENTERS_LIMA' | 'OWNERS_ALL' | 'INACTIVE_90D' | 'MINING_SOUTH' | 'NEW_SIGNUPS'

export interface Campaign {
  id: string
  name: string
  subject: string
  /** First lines of the email, for the preview. */
  body: string
  segment: CampaignSegment
  status: CampaignStatus
  recipients: number
  /** Opened / delivered, 0-100; null until sent. */
  openRate: number | null
  clickRate: number | null
  date: IsoDateTime
}

export type RecoveryStatus = 'PENDING' | 'RECOVERED'

export interface AbandonedQuote {
  id: string
  company: string
  contact: string
  phone: string
  equipment: string
  city: AdminCity
  days: number
  amount: number
  abandonedAt: IsoDateTime
  status: RecoveryStatus
}

export type OnboardingStep = 'ACCOUNT' | 'RUC' | 'REPRESENTATIVE' | 'DOCUMENTS' | 'FIRST_LISTING'

/** Where the sign-up started: the web form, "Continuar con Google" or the Android app. */
export type SignupChannel = 'WEB' | 'GOOGLE' | 'MOBILE'

export interface AbandonedSignup {
  id: string
  /** Company name as typed in the first step (SUNAT's legal name once the RUC step is done). */
  company: string
  /** Who filled in the form, and the job title they gave. */
  contactName: string
  contactRole: string
  /** Mobile number with country code, as typed; it is what the follow-up by WhatsApp uses. */
  phone: string
  email: string
  /** Null until the RUC step is done. */
  ruc: string | null
  channel: SignupChannel
  city: AdminCity
  /** Steps finished, out of `ONBOARDING_STEPS.length`. */
  completed: number
  lastSeenAt: IsoDateTime
  followedUp: boolean
}

// --- AI copilot telemetry ---

export interface AiQueryStat {
  query: string
  count: number
  /** Share of those conversations that ended in a reservation request, 0-100. */
  conversion: number
  /** Count in the previous 30 days. */
  previousCount: number
}

export interface DemandGap {
  city: AdminCity
  workType: AdminWorkType
  /** Searches in the last 30 days that found no machine free. */
  unmetSearches: number
  availableUnits: number
  /** What those searches would have billed at the median rate, in soles. */
  lostRevenue: number
}

export interface AiRecommendationWeek {
  /** Monday of the week. */
  week: IsoDate
  shown: number
  clicked: number
  booked: number
}

export interface AiTelemetry {
  topQueries: AiQueryStat[]
  gaps: DemandGap[]
  weeks: AiRecommendationWeek[]
}

// --- Settlements and escrow ---

export type EscrowStatus = 'HELD' | 'RELEASE_SCHEDULED' | 'DISPUTED'

export interface EscrowHold {
  code: string
  renter: string
  owner: string
  equipment: string
  rental: number
  deposit: number
  releaseOn: IsoDate
  status: EscrowStatus
}

export type PayoutStatus = 'PAID' | 'PROCESSING' | 'SCHEDULED' | 'ON_HOLD'

export interface Payout {
  id: string
  owner: string
  bank: 'BCP' | 'BBVA' | 'Interbank' | 'Scotiabank'
  /** Rentals settled in this payout, before the commission. */
  gross: number
  commission: number
  status: PayoutStatus
  date: IsoDate
}

export interface AdminFinance {
  escrow: EscrowHold[]
  payouts: Payout[]
  /** RentEquip's cut of each rental, 0-1. */
  commissionRate: number
  /** Commission earned per month, oldest first (last 6). */
  monthlyCommission: { month: IsoDate; amount: number }[]
}
