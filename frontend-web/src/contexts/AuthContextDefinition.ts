import { createContext } from 'react'
import type { SessionEndReason } from '../hooks/useSessionTimeout'
import type { AuthUser, LoginRequest, RegisterRequest } from '../types'

export interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  /** Why the last session ended on its own (inactivity or expiry); null after a login or a manual logout. */
  sessionEnd: SessionEndReason | null
  login: (credentials: LoginRequest) => Promise<void>
  register: (request: RegisterRequest) => Promise<void>
  logout: () => void
  /** Applies a change made on the profile screen to the signed-in user (the company name). */
  updateUser: (patch: Partial<AuthUser>) => void
}

/** Router state handed to the login page by redirects. */
export interface LoginLocationState {
  from?: string
  sessionExpired?: boolean
  /** The session was closed after a long stretch without activity. */
  sessionIdle?: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
