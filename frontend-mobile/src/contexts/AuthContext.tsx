import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useToast } from '../hooks/useToast'
import i18n from '../i18n'
import { setSessionExpiredHandler } from '../services/api'
import { authStorage } from '../services/authStorage'
import { authService } from '../services/rentequipApi'
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest, TwoFactorChallenge, TwoFactorVerifyRequest } from '../types/api'

export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn'

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  /** Resolves with the challenge when the account has the two-step verification on; null once signed in. */
  login: (credentials: LoginRequest) => Promise<TwoFactorChallenge | null>
  verifyLogin: (request: TwoFactorVerifyRequest) => Promise<void>
  register: (request: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('restoring')
  useEffect(() => {
    let isMounted = true
    authStorage.load().then((session) => {
      if (!isMounted) return
      setUser(session?.user ?? null)
      setStatus(session ? 'signedIn' : 'signedOut')
    })
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null)
      setStatus('signedOut')
      toast.info(i18n.t('auth.sessionExpired'), i18n.t('auth.sessionExpiredHint'))
    })
    return () => setSessionExpiredHandler(null)
  }, [toast])

  const startSession = useCallback(async (auth: AuthResponse) => {
    const session = await authStorage.save(auth)
    setUser(session.user)
    setStatus('signedIn')
  }, [])

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const result = await authService.login(credentials)
      if ('challengeId' in result) return result
      await startSession(result)
      return null
    },
    [startSession],
  )

  const verifyLogin = useCallback(
    async (request: TwoFactorVerifyRequest) => startSession(await authService.verifyLogin(request)),
    [startSession],
  )

  const register = useCallback(async (request: RegisterRequest) => {
    const session = await authStorage.save(await authService.register(request))
    setUser(session.user)
    setStatus('signedIn')
  }, [])

  const logout = useCallback(async () => {
    await authStorage.clear()
    setUser(null)
    setStatus('signedOut')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, verifyLogin, register, logout }),
    [status, user, login, verifyLogin, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
