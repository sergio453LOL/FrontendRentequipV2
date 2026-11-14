import { useSyncExternalStore } from 'react'

/**
 * Machines the assistant recommended during this browser session. The catalogue marks them "Suggested by
 * AI", so the tag always comes from a real answer and disappears when the tab is closed.
 */
const STORAGE_KEY = 'rentequip.aiSuggested'
const listeners = new Set<() => void>()

function read(): number[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : []
  } catch {
    return []
  }
}

let snapshot = new Set(read())

export function rememberSuggested(ids: number[]): void {
  if (ids.length === 0) return
  snapshot = new Set([...snapshot, ...ids])
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...snapshot]))
  } catch {
    // Blocked storage: the tags still show until the page is reloaded.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAiSuggested(): ReadonlySet<number> {
  return useSyncExternalStore(subscribe, () => snapshot)
}
