import { createContext } from 'react'
import type { SessionEndReason } from '../hooks/useSessionTimeout'
import type {
  AuthUser,
  GoogleRegisterRequest,
  GoogleSignup,
  LoginRequest,
  RegisterRequest,
  TwoFactorChallenge,
  TwoFactorVerifyRequest,
} from '../types'

export interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  /** Why the last session ended on its own (inactivity or expiry); null after a login or a manual logout. */
  sessionEnd: SessionEndReason | null
  /** Resolves with the challenge when the account has the two-step verification on; null once signed in. */
  login: (credentials: LoginRequest) => Promise<TwoFactorChallenge | null>
  /** Same as `login` with the Google credential; rejects with 404 GOOGLE_ACCOUNT_NOT_REGISTERED for a new email. */
  loginWithGoogle: (credential: string) => Promise<TwoFactorChallenge | null>
  /** Second step of a protected login: the code that was sent. */
  verifyLogin: (request: TwoFactorVerifyRequest) => Promise<void>
  register: (request: RegisterRequest) => Promise<void>
  /** Enters as the shared demo renter ("Probar la demo"), without a password. */
  loginAsDemo: () => Promise<void>
  registerWithGoogle: (request: GoogleRegisterRequest) => Promise<void>
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
  /** Set by a Google login that found no account: the sign-up form starts from it, without a password. */
  google?: GoogleSignup
}

export const AuthContext = createContext<AuthContextValue | null>(null)
