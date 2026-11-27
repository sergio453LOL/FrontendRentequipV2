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
  /** False for an account created with Google that never set a password: it confirms changes with an email code. */
  passwordSet: boolean
  /**
   * Operator of the marketplace (an ADMIN listed in the backend's PLATFORM_ADMIN_EMAILS), not only of its own
   * company: only they see the platform panel. Optional while an older backend does not send it.
   */
  platformAdmin?: boolean
  /** The shared account of "Probar la demo": the app shows a banner and its settings are read-only. */
  demoAccount?: boolean
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

/**
 * With the current password; an account without one (created with Google) sends instead the code that
 * `profileService.sendAccountCode` mailed to it.
 */
export interface PasswordChangeRequest {
  currentPassword?: string
  newPassword: string
  challengeId?: string
  code?: string
}

/** Turning the two-step verification off: the password, or an email code for an account without one. */
export interface TwoFactorDisableRequest {
  password?: string
  challengeId?: string
  code?: string
}
