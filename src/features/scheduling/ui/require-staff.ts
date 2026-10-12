import { getAuthSession } from '@/features/auth'

const STAFF_ROLES = new Set(['admin', 'superadmin'])

export async function isStaff(): Promise<boolean> {
  const session = await getAuthSession()
  return session !== null && STAFF_ROLES.has(session.role)
}
