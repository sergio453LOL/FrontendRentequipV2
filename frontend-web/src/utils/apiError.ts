import { AxiosError } from 'axios'
import i18n from '../i18n'
import type { es } from '../i18n/es'
import type { ErrorResponse, FieldValidationError } from '../types'

/** HTTP statuses with their own message in i18n `errors.status`. */
const STATUS_MESSAGES = new Set([400, 401, 403, 404, 409, 422, 429])

/** Business errors whose code says more than the HTTP status alone (i18n `errors.code`). */
type MessageCode = keyof typeof es.errors.code
const isMessageCode = (code: string): code is MessageCode => i18n.exists(`errors.code.${code}`)

/** Codes whose backend message is already written for the end user (e.g. the bank's decline reason). */
const USER_FACING_CODES = new Set(['PAYMENT_DECLINED', 'DELIVERY_FAILED', 'CHANNEL_NOT_CONFIGURED'])

/**
 * Normalized error thrown by the API layer. `message` is always safe to show to the user, in the language
 * active when the error happened.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string | undefined
  readonly serverMessage: string | undefined
  readonly details: FieldValidationError[]

  constructor(
    message: string,
    options: { status: number; code?: string; serverMessage?: string; details?: FieldValidationError[] },
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code
    this.serverMessage = options.serverMessage
    this.details = options.details ?? []
  }

  /** Status 0 means the request never got an HTTP response (offline, DNS, CORS, timeout). */
  get isNetworkError(): boolean {
    return this.status === 0
  }

  /** Network failures and 5xx/429 responses are worth retrying; client errors are not. */
  get isRetryable(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500
  }

  /** Validation errors indexed by field name, ready to feed a form. */
  get fieldErrors(): Record<string, string> {
    return Object.fromEntries(this.details.map((detail) => [detail.field, detail.message]))
  }

  static fromAxios(error: AxiosError<ErrorResponse>): ApiError {
    const response = error.response
    if (!response) {
      const isTimeout = error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT
      return new ApiError(i18n.t(isTimeout ? 'errors.timeout' : 'errors.network'), { status: 0, code: error.code })
    }

    const { status, data } = response
    const codeMessage =
      data?.code && USER_FACING_CODES.has(data.code) && data.message
        ? data.message
        : data?.code && isMessageCode(data.code)
          ? i18n.t(`errors.code.${data.code}`)
          : undefined
    const message =
      codeMessage ??
      (status >= 500
        ? i18n.t('errors.server')
        : STATUS_MESSAGES.has(status)
          ? i18n.t(`errors.status.http${status as 400}`)
          : i18n.t('errors.unknown'))
    return new ApiError(message, {
      status,
      code: data?.code,
      serverMessage: data?.message,
      details: data?.details,
    })
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error
    if (error instanceof AxiosError) return ApiError.fromAxios(error)
    return new ApiError(i18n.t('errors.unknown'), { status: -1 })
  }
}

export function getErrorMessage(error: unknown): string {
  return ApiError.from(error).message
}
