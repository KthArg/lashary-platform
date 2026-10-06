export const AUTH_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  CLIENTE: 'cliente',
} as const

export type AuthRole = (typeof AUTH_ROLES)[keyof typeof AUTH_ROLES]

const STAFF_ROLES: readonly AuthRole[] = [AUTH_ROLES.ADMIN, AUTH_ROLES.SUPERADMIN]

export function isStaffRole(role: string | null | undefined): boolean {
  return STAFF_ROLES.includes(role as AuthRole)
}
