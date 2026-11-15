import { useSyncExternalStore } from 'react'

const REFRESH_EVENT = 'rentequip:refresh'
let version = 0

/** Asks every mounted loader on the page to fetch its data again, without a full browser reload. */
export function requestRefresh() {
  version += 1
  window.dispatchEvent(new Event(REFRESH_EVENT))
}

function subscribe(onChange: () => void) {
  window.addEventListener(REFRESH_EVENT, onChange)
  return () => window.removeEventListener(REFRESH_EVENT, onChange)
}

const getVersion = () => version

/** A number that grows each time the refresh button is pressed: add it to a loader's dependencies to reload with it. */
export function useRefreshSignal(): number {
  return useSyncExternalStore(subscribe, getVersion, () => 0)
}
