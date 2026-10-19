import type { User } from '@supabase/supabase-js'
import type { AuthRole } from '../domain/roles'

export interface ClientProfile {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string
  phone_verified: boolean
  created_at: string
  updated_at: string
}

export interface ClientPhoneProfile {
  userId: string
  fullName: string
  email: string
  phone: string
}

export interface PasswordCredentials {
  email: string
  password: string
}

export interface GoogleSignInStart {
  failed: boolean
  url: string | null
}

export interface AuthRepository {
  findRole(userId: string): Promise<AuthRole | null>
  findClientProfile(userId: string): Promise<ClientProfile | null>
  saveClientPhone(profile: ClientPhoneProfile): Promise<{ ok: boolean }>
  getCurrentUser(): Promise<User | null>
  signInWithPassword(credentials: PasswordCredentials): Promise<User | null>
  signInWithGoogle(redirectTo: string): Promise<GoogleSignInStart>
  signOut(): Promise<void>
}
