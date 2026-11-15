import type { AuthResponse, LoginRequest, RegisterRequest, TwoFactorChallenge, TwoFactorVerifyRequest } from '../types'
import { api } from './api'
import { ENDPOINTS } from './endpoints'

export const authService = {
  /** 200 brings the tokens; 202 means the account has the two-step verification on and a code was sent. */
  async login(credentials: LoginRequest): Promise<AuthResponse | TwoFactorChallenge> {
    const { data } = await api.post<AuthResponse | TwoFactorChallenge>(ENDPOINTS.auth.login, credentials)
    return data
  },

  async verifyLogin(request: TwoFactorVerifyRequest): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>(ENDPOINTS.auth.loginVerify, request)
    return data
  },

  async register(request: RegisterRequest): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>(ENDPOINTS.auth.register, request)
    return data
  },
}
