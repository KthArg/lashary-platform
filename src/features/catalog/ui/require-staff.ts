import { getAuthSession } from '@/features/auth'

const STAFF_ROLES = new Set(['admin', 'superadmin'])

// Chequeo "amable" de rol para los server actions (SEC-001): la autorización real la hacen
// las políticas RLS catalog_techniques_*_staff. Esto solo evita una llamada perdida y da un
// mensaje claro. Consume el contrato público de auth (getAuthSession, ARCH-003).
export async function isStaff(): Promise<boolean> {
  const session = await getAuthSession()
  return session !== null && STAFF_ROLES.has(session.role)
}
