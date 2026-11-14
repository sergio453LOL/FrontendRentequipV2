import * as SecureStore from 'expo-secure-store'
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { darkColors, lightColors, type Palette } from '../theme'

/** `system` follows the phone's setting, which is also the default. */
export type ThemePreference = 'system' | 'light' | 'dark'
export type ColorScheme = 'light' | 'dark'

export interface ThemeContextValue {
  colors: Palette
  scheme: ColorScheme
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

const STORAGE_KEY = 'rentequip.theme'
const PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark']

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme()
  const [preference, setPreferenceState] = useState<ThemePreference>('system')

  useEffect(() => {
    let isMounted = true
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((stored) => {
        if (isMounted && PREFERENCES.includes(stored as ThemePreference)) setPreferenceState(stored as ThemePreference)
      })
      .catch(() => {
        // Unreadable storage: keep following the system.
      })
    return () => {
      isMounted = false
    }
  }, [])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {
      // The choice still applies until the app is closed.
    })
  }, [])

  const scheme: ColorScheme = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference
  const value = useMemo<ThemeContextValue>(
    () => ({ colors: scheme === 'dark' ? darkColors : lightColors, scheme, preference, setPreference }),
    [scheme, preference, setPreference],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
