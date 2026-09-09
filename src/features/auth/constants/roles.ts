export const AUTH_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  CLIENTE: 'cliente',
} as const

export type AuthRole = (typeof AUTH_ROLES)[keyof typeof AUTH_ROLES]
