import type { TwoFactorChannel } from './auth'
import type { IsoDateTime } from './common'

export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR'

export interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  phone: string | null
  /** Public URL of the profile photo; null shows the initials. */
  avatarUrl: string | null
  role: UserRole
  enabled: boolean
  companyId: number
  companyName: string
  createdAt: IsoDateTime
  /** Where the sign-in code goes; null when the two-step verification is off. */
  twoFactorChannel: TwoFactorChannel | null
}

export interface UserCreateRequest {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
  role: UserRole
  companyId: number
}

export type UserUpdateRequest = Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'role'>>

/** Self-service profile. An empty string removes the phone or the photo. */
export interface ProfileUpdateRequest {
  firstName?: string
  lastName?: string
  phone?: string
  avatarUrl?: string
}

export interface PasswordChangeRequest {
  currentPassword: string
  newPassword: string
}
