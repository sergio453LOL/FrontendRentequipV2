import * as Location from 'expo-location'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking } from 'react-native'
import { DEFAULT_LOCATION } from '../config/env'
import type { Coordinates } from '../utils/format'

export type LocationStatus = 'locating' | 'granted' | 'denied' | 'servicesOff' | 'error'

export interface CurrentLocation {
  /** Real GPS position, or Lima as a fallback so the screens always have a point to work with. */
  coords: Coordinates
  status: LocationStatus
  isFallback: boolean
  /** Friendly explanation of the fallback, or null when the GPS position is in use. */
  message: string | null
  /** Asks again, or opens the system settings when the user already said "never". */
  requestAccess: () => void
}

const FALLBACK_MESSAGES = {
  denied: 'location.denied',
  servicesOff: 'location.servicesOff',
  error: 'location.error',
} as const satisfies Record<Exclude<LocationStatus, 'locating' | 'granted'>, string>

/** GPS sensor (expo-location) with permission handling and a fallback when it is not available. */
export function useCurrentLocation(): CurrentLocation {
  const { t } = useTranslation()
  const [coords, setCoords] = useState<Coordinates>(DEFAULT_LOCATION)
  const [status, setStatus] = useState<LocationStatus>('locating')
  const [canAskAgain, setCanAskAgain] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isActive = true
    async function locate() {
      setStatus('locating')
      try {
        const permission = await Location.requestForegroundPermissionsAsync()
        if (!isActive) return
        setCanAskAgain(permission.canAskAgain)
        if (!permission.granted) {
          setStatus('denied')
          return
        }
        if (!(await Location.hasServicesEnabledAsync())) {
          if (isActive) setStatus('servicesOff')
          return
        }
        // A recent cached fix shows results instantly; the fresh one refines them.
        const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 })
        if (lastKnown && isActive) {
          setCoords({ latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude })
          setStatus('granted')
        }
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        if (!isActive) return
        setCoords({ latitude: current.coords.latitude, longitude: current.coords.longitude })
        setStatus('granted')
      } catch {
        if (isActive) setStatus((previous) => (previous === 'granted' ? previous : 'error'))
      }
    }
    void locate()
    return () => {
      isActive = false
    }
  }, [attempt])

  const requestAccess = useCallback(() => {
    if (status === 'denied' && !canAskAgain) {
      void Linking.openSettings()
      return
    }
    setAttempt((value) => value + 1)
  }, [status, canAskAgain])

  const isFallback = status !== 'granted'
  const message = status === 'granted' || status === 'locating' ? null : t(FALLBACK_MESSAGES[status])
  return { coords: isFallback ? DEFAULT_LOCATION : coords, status, isFallback, message, requestAccess }
}
