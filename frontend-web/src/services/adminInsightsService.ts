import {
  mockAbandonedQuotes,
  mockAbandonedSignups,
  mockAiTelemetry,
  mockCampaigns,
  mockDashboard,
  mockEvents,
  mockFinance,
} from '../data/adminMockData'
import type {
  AbandonedQuote,
  AbandonedSignup,
  AdminDashboard,
  AdminFinance,
  AiTelemetry,
  AuditEvent,
  Campaign,
} from '../types'

/** Answers like a request would, so the screens already show their loading state. */
const DEMO_LATENCY_MS = 280

function demo<T>(build: () => T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(build()), DEMO_LATENCY_MS))
}

/**
 * Platform-wide figures the backend does not aggregate yet: the dashboard, the audit trail, marketing, the
 * copilot's telemetry and settlements. Each method has the signature its endpoint will have, so wiring the
 * backend later only changes the body (`api.get<AdminDashboard>('/admin/dashboard')` and so on).
 */
export const adminInsightsService = {
  dashboard: (): Promise<AdminDashboard> => demo(mockDashboard),
  events: (): Promise<AuditEvent[]> => demo(mockEvents),
  campaigns: (): Promise<Campaign[]> => demo(mockCampaigns),
  abandonedQuotes: (): Promise<AbandonedQuote[]> => demo(mockAbandonedQuotes),
  abandonedSignups: (): Promise<AbandonedSignup[]> => demo(mockAbandonedSignups),
  aiTelemetry: (): Promise<AiTelemetry> => demo(mockAiTelemetry),
  finance: (): Promise<AdminFinance> => demo(mockFinance),
}

/** Modules that run on demonstration data, so the shell can mark them (`admin.demo.*`). */
export const DEMO_MODULES = ['dashboard', 'movements', 'marketing', 'ai', 'finance'] as const
/** Modules that read the backend and add demonstration rows after the real ones. */
export const MIXED_MODULES = ['companies', 'catalog'] as const
