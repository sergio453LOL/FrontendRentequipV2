import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionTimeout, type SessionEndReason } from '../hooks/useSessionTimeout'
import { PATHS } from '../routes/paths'
import { setUnauthorizedHandler } from '../services/api'
import { authService } from '../services/authService'
import type {
  AuthResponse,
  AuthUser,
  GoogleRegisterRequest,
  LoginRequest,
  RegisterRequest,
  TwoFactorVerifyRequest,
} from '../types'
import { toAuthUser, tokenStorage } from '../utils/tokenStorage'
import { AuthContext, type AuthContextValue } from './AuthContextDefinition'

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(() => tokenStorage.getUser())
  const [sessionEnd, setSessionEnd] = useState<SessionEndReason | null>(null)

  /** The protected route that bounces the user to the login page reads the reason to explain why. */
  const endSession = useCallback((reason: SessionEndReason) => {
    tokenStorage.clear()
    setSessionEnd(reason)
    setUser(null)
  }, [])
  useSessionTimeout(user !== null, endSession)

  useEffect(() => {
    setUnauthorizedHandler(() => endSession('expired'))
    return () => setUnauthorizedHandler(null)
  }, [endSession])

  const startSession = useCallback((auth: AuthResponse) => {
    tokenStorage.setSession(auth)
    setSessionEnd(null)
    setUser(toAuthUser(auth))
  }, [])

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const result = await authService.login(credentials)
      if ('challengeId' in result) return result
      startSession(result)
      return null
    },
    [startSession],
  )

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const result = await authService.loginWithGoogle(credential)
      if ('challengeId' in result) return result
      startSession(result)
      return null
    },
    [startSession],
  )

  const registerWithGoogle = useCallback(
    async (request: GoogleRegisterRequest) => startSession(await authService.registerWithGoogle(request)),
    [startSession],
  )

  const loginAsDemo = useCallback(async () => startSession(await authService.loginAsDemo()), [startSession])

  const verifyLogin = useCallback(
    async (request: TwoFactorVerifyRequest) => startSession(await authService.verifyLogin(request)),
    [startSession],
  )

  const register = useCallback(async (request: RegisterRequest) => {
    const auth = await authService.register(request)
    tokenStorage.setSession(auth)
    setSessionEnd(null)
    setUser(toAuthUser(auth))
  }, [])

  const logout = useCallback(() => {
    tokenStorage.clear()
    setSessionEnd(null)
    setUser(null)
    navigate(PATHS.login, { replace: true })
  }, [navigate])

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    const next = tokenStorage.updateUser(patch)
    if (next) setUser(next)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      sessionEnd,
      login,
      loginWithGoogle,
      verifyLogin,
      register,
      registerWithGoogle,
      loginAsDemo,
      logout,
      updateUser,
    }),
    [user, sessionEnd, login, loginWithGoogle, verifyLogin, register, registerWithGoogle, loginAsDemo, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
