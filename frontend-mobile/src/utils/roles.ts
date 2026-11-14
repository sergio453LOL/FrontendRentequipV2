import type { UserRole } from '../types/api'

/** Roles the backend lets publish equipment and manage reservation status (`hasAnyRole('ADMIN','MANAGER')`). */
export const PUBLISHER_ROLES: readonly UserRole[] = ['ADMIN', 'MANAGER']

export function canPublish(role: UserRole | undefined): boolean {
  return role !== undefined && PUBLISHER_ROLES.includes(role)
}

/** Only company admins can create, rename or delete catalogue categories (`hasRole('ADMIN')`). */
export function canManageCategories(role: UserRole | undefined): boolean {
  return role === 'ADMIN'
}
