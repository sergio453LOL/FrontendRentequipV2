import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { AuthResponse, ErrorResponse, RefreshTokenRequest } from '../types'
import { ApiError } from '../utils/apiError'
import { tokenStorage } from '../utils/tokenStorage'

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1'

// A page served over HTTPS (Vercel) cannot call an http:// API: the browser blocks it as mixed content.
if (window.location.protocol === 'https:' && API_BASE_URL.startsWith('http://')) {
  console.error(`VITE_API_URL (${API_BASE_URL}) usa http:// y el navegador bloqueará las peticiones. Usa la URL https:// del backend.`)
}

/**
 * Behind the Vercel proxy (VITE_API_URL=/api/v1) the backend still builds photo URLs with its own host,
 * which some networks block. VITE_BACKEND_ORIGIN names that host so responses can use same-origin paths
 * instead, served by the same proxy.
 */
const BEHIND_PROXY = API_BASE_URL.startsWith('/')
const BACKEND_ORIGIN = BEHIND_PROXY ? import.meta.env.VITE_BACKEND_ORIGIN?.replace(/\/$/, '') : undefined

/**
 * Files the proxy also serves. Whatever host the backend wrote in front of them (its own IP when the
 * proxy reaches it directly), the same-origin path works and never trips mixed content.
 */
const PROXIED_FILE = /^https?:\/\/[^/]+(\/(?:demo-images|uploads|demo-manuals)\/[^\s]*)$/

function toSameOrigin(value: unknown): unknown {
  if (typeof value === 'string') {
    if (BACKEND_ORIGIN && value.startsWith(`${BACKEND_ORIGIN}/`)) {
      return value.slice(BACKEND_ORIGIN.length)
    }
    return value.replace(PROXIED_FILE, '$1')
  }
  if (Array.isArray(value)) {
    return value.map(toSameOrigin)
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, toSameOrigin(entry)]))
  }
  return value
}

const REQUEST_TIMEOUT_MS = 15_000
const AUTH_PATH_PREFIX = '/auth/'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

/** Lets the AuthProvider decide what happens when the session can no longer be recovered. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

let pendingRefresh: Promise<string> | null = null

api.interceptors.request.use(async (config) => {
  let token = tokenStorage.getAccessToken()
  // The access token lives only in memory: after a reload, trade the refresh token for a new one first.
  if (!token && tokenStorage.getRefreshToken() && !config.url?.startsWith(AUTH_PATH_PREFIX)) {
    try {
      token = await refreshOnce()
    } catch {
      // Sent without a token: a 401 then ends the session in the response interceptor.
    }
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }
  const body: RefreshTokenRequest = { refreshToken }
  const { data } = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, body, {
    timeout: REQUEST_TIMEOUT_MS,
  })
  tokenStorage.setSession(data)
  return data.accessToken
}

/** Concurrent 401s share one refresh call instead of each burning the refresh token. */
function refreshOnce(): Promise<string> {
  pendingRefresh ??= refreshAccessToken().finally(() => {
    pendingRefresh = null
  })
  return pendingRefresh
}

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
}

api.interceptors.response.use(
  (response) => {
    if (BEHIND_PROXY) {
      response.data = toSameOrigin(response.data)
    }
    return response
  },
  async (error: unknown) => {
    if (axios.isCancel(error) || !(error instanceof AxiosError)) {
      return Promise.reject(error)
    }

    const axiosError = error as AxiosError<ErrorResponse>
    const originalRequest = axiosError.config as RetriableRequestConfig | undefined
    const isAuthRequest = originalRequest?.url?.startsWith(AUTH_PATH_PREFIX) ?? false

    if (axiosError.response?.status === 401 && originalRequest && !isAuthRequest) {
      if (!originalRequest._retried) {
        originalRequest._retried = true
        try {
          const newToken = await refreshOnce()
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        } catch {
          // The refresh token is expired or revoked too: fall through and end the session.
        }
      }
      tokenStorage.clear()
      unauthorizedHandler?.()
    }

    return Promise.reject(ApiError.fromAxios(axiosError))
  },
)
