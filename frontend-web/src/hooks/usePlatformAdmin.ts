import { ENDPOINTS } from '../services/endpoints'
import type { User } from '../types'
import { useAuth } from './useAuth'
import { useFetch } from './useFetch'

/**
 * Whether the signed-in user operates the marketplace itself. Every company's own ADMIN is not one: the
 * backend says so in `/users/me` (`platformAdmin`), from its PLATFORM_ADMIN_EMAILS list. The panel's API
 * calls are still checked by the backend; this only decides what the web shows.
 */
export function usePlatformAdmin(): { isPlatformAdmin: boolean; isLoading: boolean } {
  const { user } = useAuth()
  const me = useFetch<User>(user?.role === 'ADMIN' ? ENDPOINTS.me : null)
  return { isPlatformAdmin: me.data?.platformAdmin === true, isLoading: me.isLoading }
}
