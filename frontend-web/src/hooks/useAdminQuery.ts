import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { ApiError } from '../utils/apiError'
import { useRefreshSignal } from './useRefreshSignal'

export interface AdminQuery<T> {
  data: T | null
  error: ApiError | null
  isLoading: boolean
  reload: () => void
  /** Local edits (approve, hide, mark as recovered) applied on top of what was loaded. */
  setData: Dispatch<SetStateAction<T | null>>
}

interface Settled<T> {
  /** Which request this answer belongs to; the query is loading while it differs from the current one. */
  key: string | null
  data: T | null
  error: ApiError | null
}

/**
 * Loads one of the platform panel's services (`admin*Service`). Unlike `useFetch` the loader may read the
 * backend, the demonstration data or both. Pass a stable function (a service method), not an inline one.
 * A reload keeps the previous data on screen until the new answer arrives.
 */
export function useAdminQuery<T>(loader: () => Promise<T>): AdminQuery<T> {
  const [reloadCount, setReloadCount] = useState(0)
  const refreshSignal = useRefreshSignal()
  const key = `${reloadCount}:${refreshSignal}`
  const [settled, setSettled] = useState<Settled<T>>({ key: null, data: null, error: null })

  useEffect(() => {
    let isCurrent = true
    loader()
      .then((data) => {
        if (isCurrent) setSettled({ key, data, error: null })
      })
      .catch((caught: unknown) => {
        if (isCurrent) setSettled((previous) => ({ key, data: previous.data, error: ApiError.from(caught) }))
      })
    return () => {
      isCurrent = false
    }
  }, [loader, key])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])
  const setData = useCallback<Dispatch<SetStateAction<T | null>>>(
    (action) => setSettled((previous) => ({ ...previous, data: action instanceof Function ? action(previous.data) : action })),
    [],
  )
  return { data: settled.data, error: settled.key === key ? settled.error : null, isLoading: settled.key !== key, reload, setData }
}
