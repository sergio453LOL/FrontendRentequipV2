import { useCallback, useEffect, useState } from 'react'

export interface VisitorCoords {
  latitude: number
  longitude: number
}

export type LocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable'

const STORAGE_KEY = 'rentequip.visitorLocation'

function readStored(): VisitorCoords | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as VisitorCoords) : null
  } catch {
    return null
  }
}

/**
 * The visitor's position, asked for only when they press "near me" (or already granted it), and kept for
 * the browser session so moving between pages does not ask again.
 */
export function useVisitorLocation() {
  const [coords, setCoords] = useState<VisitorCoords | null>(readStored)
  const [status, setStatus] = useState<LocationStatus>(() => (readStored() ? 'ready' : 'idle'))

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable')
      return
    }
    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { latitude: Number(position.coords.latitude.toFixed(6)), longitude: Number(position.coords.longitude.toFixed(6)) }
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch {
          // Private mode: the position still works for this page.
        }
        setCoords(next)
        setStatus('ready')
      },
      (error) => setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }, [])

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing stored.
    }
    setCoords(null)
    setStatus('idle')
  }, [])

  // Permission already given on an earlier visit: locate without a click.
  useEffect(() => {
    if (coords || !navigator.permissions?.query) return
    let isMounted = true
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((permission) => {
        if (isMounted && permission.state === 'granted') request()
      })
      .catch(() => undefined)
    return () => {
      isMounted = false
    }
  }, [coords, request])

  return { coords, status, request, clear }
}
