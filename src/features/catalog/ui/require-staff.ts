import { getAuthSession, isStaffRole } from '@/features/auth'

export async function isStaff(): Promise<boolean> {
  const session = await getAuthSession()
  return session !== null && isStaffRole(session.role)
}
