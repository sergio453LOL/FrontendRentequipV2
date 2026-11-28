import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useToast } from '../hooks/useToast'
import i18n from '../i18n'
import { setSessionExpiredHandler } from '../services/api'
import { authStorage } from '../services/authStorage'
import { authService, userService } from '../services/rentequipApi'
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest, TwoFactorChallenge, TwoFactorVerifyRequest } from '../types/api'

export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn'

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  /** Resolves with the challenge when the account has the two-step verification on; null once signed in. */
  login: (credentials: LoginRequest) => Promise<TwoFactorChallenge | null>
  verifyLogin: (request: TwoFactorVerifyRequest) => Promise<void>
  /** One tap into the shared demo company, without a password. */
  loginDemo: () => Promise<void>
  /** Signed in as the shared demo account (asked to /users/me once per session). */
  isDemo: boolean
  register: (request: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('restoring')
  const [demoFor, setDemoFor] = useState<number | null>(null)
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

  const loginDemo = useCallback(async () => startSession(await authService.demo()), [startSession])

  // Whether this is the shared demo account: the banner and the test-card hint depend on it.
  const userId = user?.userId ?? null
  useEffect(() => {
    if (status !== 'signedIn' || userId === null) return
    const controller = new AbortController()
    userService.me(controller.signal).then(
      (me) => setDemoFor(me.demoAccount ? userId : null),
      () => undefined,
    )
    return () => controller.abort()
  }, [status, userId])
  const isDemo = status === 'signedIn' && userId !== null && demoFor === userId

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
    () => ({ status, user, login, verifyLogin, loginDemo, isDemo, register, logout }),
    [status, user, login, verifyLogin, loginDemo, isDemo, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
