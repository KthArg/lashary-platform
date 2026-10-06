import { getAuthSession } from '@/features/auth'

const ROLES_STAFF = new Set(['admin', 'superadmin'])

export async function esStaff(): Promise<boolean> {
  const session = await getAuthSession()
  return session !== null && ROLES_STAFF.has(session.role)
}
