import { useEffect } from 'react'
import { tokenStorage } from '../utils/tokenStorage'

/** Minutes without a click, key press or scroll before the session is closed. */
export const IDLE_TIMEOUT_MINUTES = 30

const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60_000
const CHECK_EVERY_MS = 30_000
/** Shared by every open tab, so working in one keeps the others signed in too. */
const LAST_ACTIVITY_KEY = 'rentequip.lastActivity'
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const

export type SessionEndReason = 'idle' | 'expired'

function readLastActivity(): number {
  try {
    return Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || Date.now()
  } catch {
    return Date.now()
  }
}

function writeLastActivity(time: number) {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(time))
  } catch {
    // Storage blocked: the timer still works per tab with the value it already holds.
  }
}

/** Expiry of the refresh token, which is the end of the session the backend granted at login. */
function sessionEndsAt(): number | null {
  const token = tokenStorage.getRefreshToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number }
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

/**
 * Signs the user out after {@link IDLE_TIMEOUT_MINUTES} of inactivity, or as soon as the session the
 * backend granted at login runs out, instead of leaving the account open until the next request fails.
 */
export function useSessionTimeout(isAuthenticated: boolean, onTimeout: (reason: SessionEndReason) => void) {
  useEffect(() => {
    if (!isAuthenticated) return

    let lastWrite = 0
    const markActive = () => {
      const now = Date.now()
      // Scroll fires dozens of times a second; one write every few seconds is enough.
      if (now - lastWrite > 5_000) {
        lastWrite = now
        writeLastActivity(now)
      }
    }
    markActive()

    const check = () => {
      const now = Date.now()
      const endsAt = sessionEndsAt()
      if (endsAt !== null && now >= endsAt) onTimeout('expired')
      else if (now - readLastActivity() >= IDLE_TIMEOUT_MS) onTimeout('idle')
    }

    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, markActive, { passive: true }))
    // A laptop waking from sleep fires no timer catch-up, so check the moment the tab is visible again.
    document.addEventListener('visibilitychange', check)
    const timer = window.setInterval(check, CHECK_EVERY_MS)

    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, markActive))
      document.removeEventListener('visibilitychange', check)
      window.clearInterval(timer)
    }
  }, [isAuthenticated, onTimeout])
}
