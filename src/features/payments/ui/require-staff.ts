import { getAuthSession, isStaffRole } from '@/features/auth'

export async function getStaffSession() {
  const session = await getAuthSession()
  return session !== null && isStaffRole(session.role) ? session : null
}
