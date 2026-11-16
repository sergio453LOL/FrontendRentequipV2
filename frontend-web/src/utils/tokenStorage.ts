import type { AuthResponse, AuthUser, UserRole } from '../types'

/**
 * Where the session lives:
 * - the access token (sent on every request) stays only in memory, so no script reading the storage can take it;
 * - the refresh token and the user go to sessionStorage, which the browser drops when the tab closes, so a
 *   reload keeps the user signed in (api.ts trades the refresh token for a new access token) without the
 *   session outliving the tab the way localStorage did.
 */
const SESSION_KEY = 'rentequip.session'

interface StoredSession {
  refreshToken: string
  user: AuthUser
}

const USER_ROLES: readonly UserRole[] = ['ADMIN', 'MANAGER', 'OPERATOR']

let accessToken: string | null = null

// Older builds kept both tokens in localStorage: remove them so they do not stay on the disk.
try {
  localStorage.removeItem(SESSION_KEY)
} catch {
  // Storage blocked: there is nothing stored to remove.
}

function isStoredSession(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null) return false
  const session = value as Partial<StoredSession>
  const user = session.user
  return (
    typeof session.refreshToken === 'string' &&
    typeof user === 'object' &&
    user !== null &&
    typeof user.userId === 'number' &&
    typeof user.email === 'string' &&
    USER_ROLES.includes(user.role) &&
    typeof user.companyId === 'number' &&
    typeof user.companyName === 'string'
  )
}

function readSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isStoredSession(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeSession(session: StoredSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Storage blocked: the session still works in memory until the page reloads.
  }
}

export function toAuthUser(auth: AuthResponse): AuthUser {
  return {
    userId: auth.userId,
    email: auth.email,
    role: auth.role,
    companyId: auth.companyId,
    companyName: auth.companyName,
  }
}

/** Single place that knows where the session lives, so the storage strategy can change without touching callers. */
export const tokenStorage = {
  getAccessToken: (): string | null => accessToken,
  getRefreshToken: (): string | null => readSession()?.refreshToken ?? null,
  getUser: (): AuthUser | null => readSession()?.user ?? null,

  setSession(auth: AuthResponse): void {
    accessToken = auth.accessToken
    writeSession({ refreshToken: auth.refreshToken, user: toAuthUser(auth) })
  },

  /** Keeps the session in step after the profile changes something the shell shows (the company name). */
  updateUser(patch: Partial<AuthUser>): AuthUser | null {
    const session = readSession()
    if (!session) return null
    const next: StoredSession = { ...session, user: { ...session.user, ...patch } }
    writeSession(next)
    return next.user
  },

  clear(): void {
    accessToken = null
    try {
      sessionStorage.removeItem(SESSION_KEY)
    } catch {
      // Storage blocked: nothing was stored.
    }
  },
}
