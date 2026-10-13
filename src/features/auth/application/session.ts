import type { User } from '@supabase/supabase-js'
import { AUTH_ROLES, type AuthRole } from '../domain/roles'
import type { AuthRepository, ClientProfile } from './ports'

export interface AuthSession {
  user: User
  role: AuthRole
  profile: ClientProfile | null
}

export async function loadAuthSession(repo: AuthRepository, user: User): Promise<AuthSession> {
  const [role, profile] = await Promise.all([repo.findRole(user.id), repo.findClientProfile(user.id)])
  return { user, role: role ?? AUTH_ROLES.CLIENTE, profile }
}

export function clientDisplayName(user: User): string {
  return user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente'
}
