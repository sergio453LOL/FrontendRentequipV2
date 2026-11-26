import type {
  AuthResponse,
  GoogleRegisterRequest,
  LoginRequest,
  RegisterRequest,
  TwoFactorChallenge,
  TwoFactorVerifyRequest,
} from '../types'
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

  /** Like `login`, plus a 404 GOOGLE_ACCOUNT_NOT_REGISTERED when no account has that Google email yet. */
  async loginWithGoogle(credential: string): Promise<AuthResponse | TwoFactorChallenge> {
    const { data } = await api.post<AuthResponse | TwoFactorChallenge>(ENDPOINTS.auth.google, { credential })
    return data
  },

  async registerWithGoogle(request: GoogleRegisterRequest): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>(ENDPOINTS.auth.googleRegister, request)
    return data
  },
}
