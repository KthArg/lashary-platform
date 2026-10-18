import { createClient } from '@/shared/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isStaffRole } from '../../domain/roles'
import { loadAuthSession } from '../../application/session'
import { createSupabaseAuthRepository } from '../../db/auth-repository'
import { ADMIN_PORTAL_ROUTES } from '../constants/auth-strings'

export async function getAuthSession() {
  const repository = createSupabaseAuthRepository(await createClient())
  const user = await repository.getCurrentUser()
  if (!user) return null
  return loadAuthSession(repository, user)
}

export async function requireAdminSession() {
  const session = await getAuthSession()
  if (!session?.user || !isStaffRole(session.role)) {
    redirect(ADMIN_PORTAL_ROUTES.login)
  }
  return session
}
