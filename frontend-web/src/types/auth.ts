import type { CompanyCreateRequest } from './company'
import type { UserRole } from './user'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  company: CompanyCreateRequest
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
}

export interface RefreshTokenRequest {
  refreshToken: string
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

/** Profile of the logged-in user: the `AuthResponse` without its tokens. */
export type AuthUser = Pick<AuthResponse, 'userId' | 'email' | 'role' | 'companyId' | 'companyName'>
