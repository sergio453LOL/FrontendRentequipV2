import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { useMemo } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import './src/i18n'
import { AuthProvider } from './src/contexts/AuthContext'
import { ThemeProvider } from './src/contexts/ThemeContext'
import { ToastProvider } from './src/contexts/ToastContext'
import { useTheme } from './src/hooks/useTheme'
import { AppNavigator } from './src/navigation/AppNavigator'

/** Headers, tab bar and screen backgrounds of React Navigation follow the app's palette. */
function ThemedApp() {
  const { colors, scheme } = useTheme()
  const navigationTheme = useMemo<Theme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.brandDark,
        background: colors.background,
        card: colors.surface,
        text: colors.ink,
        border: colors.border,
        notification: colors.brand,
      },
    }
  }, [colors, scheme])

  return (
    <>
      <ToastProvider>
        <AuthProvider>
          <NavigationContainer theme={navigationTheme}>
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </ToastProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
