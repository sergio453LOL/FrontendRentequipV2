import { AxiosError } from 'axios'
import i18n from '../i18n'
import type { ErrorResponse, FieldValidationError } from '../types/api'

/** HTTP statuses and backend codes with their own message under `errors.status` and `errors.code`. */
const STATUS_KEYS = [400, 401, 403, 404, 409, 413, 429] as const
const MESSAGE_CODES = [
  'DUPLICATE_RESOURCE',
  'EQUIPMENT_NOT_AVAILABLE',
  'EQUIPMENT_UNAVAILABLE',
  'INVALID_RESERVATION_DATES',
  'INVALID_STATUS_TRANSITION',
  'FORBIDDEN_OPERATION',
  'FILE_TOO_LARGE',
  'INVALID_OPERATION',
  'DATA_INTEGRITY_VIOLATION',
  'PAYMENT_PROVIDER_ERROR',
  'EQUIPMENT_HAS_HISTORY',
  'TOO_MANY_REQUESTS',
  'DEMO_ACCOUNT_LOCKED',
] as const

type MessageCode = (typeof MESSAGE_CODES)[number]
type MessageStatus = (typeof STATUS_KEYS)[number]

function isMessageCode(code: string | undefined): code is MessageCode {
  return (MESSAGE_CODES as readonly string[]).includes(code ?? '')
}

function isMessageStatus(status: number): status is MessageStatus {
  return (STATUS_KEYS as readonly number[]).includes(status)
}

/** Backend messages that are already written for the end user (payments and receipt delivery). */
const USER_FACING_CODES = new Set([
  'PAYMENT_DECLINED',
  'DELIVERY_FAILED',
  'CHANNEL_NOT_CONFIGURED',
  // Two-step verification: the server message says what to do (attempts left, seconds to wait...).
  'INVALID_VERIFICATION_CODE',
  'VERIFICATION_CODE_EXPIRED',
  'VERIFICATION_CODE_TOO_SOON',
  'TWO_FACTOR_WRONG_PASSWORD',
  'TWO_FACTOR_PHONE_REQUIRED',
])

/** Normalized API error; `message` is always friendly, in the app's language, and safe to show to the user. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string | undefined
  readonly details: FieldValidationError[]

  constructor(message: string, status: number, code?: string, details: FieldValidationError[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  /** No HTTP response at all: offline, wrong server URL, DNS, timeout. */
  get isNetworkError(): boolean {
    return this.status === 0
  }

  get isRetryable(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500
  }

  static fromAxios(error: AxiosError<ErrorResponse>): ApiError {
    const response = error.response
    if (!response) {
      const isTimeout = error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT
      return new ApiError(i18n.t(isTimeout ? 'errors.timeout' : 'errors.network'), 0, error.code)
    }
    const { status, data } = response
    const code = data?.code
    let message: string
    if (status >= 500) message = i18n.t('errors.server')
    else if (code && USER_FACING_CODES.has(code) && data?.message) message = data.message
    else if (isMessageCode(code)) message = i18n.t(`errors.code.${code}`)
    else if (isMessageStatus(status)) message = i18n.t(`errors.status.${status}`)
    else message = i18n.t('errors.unknown')
    return new ApiError(message, status, code, data?.details ?? [])
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error
    if (error instanceof AxiosError) return ApiError.fromAxios(error)
    return new ApiError(i18n.t('errors.unknown'), -1)
  }
}

export function getErrorMessage(error: unknown): string {
  return ApiError.from(error).message
}
