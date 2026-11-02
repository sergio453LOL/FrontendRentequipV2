import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'rentequip.sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/** Whether the desktop sidebar shows only icons. The choice is remembered per browser. */
export function useSidebarCollapsed(): [boolean, () => void] {
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isCollapsed))
    } catch {
      // Private mode or blocked storage: the sidebar still toggles for this visit.
    }
  }, [isCollapsed])

  const toggle = useCallback(() => setIsCollapsed((collapsed) => !collapsed), [])
  return [isCollapsed, toggle]
}
