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

export interface AuthRepository {
  findRole(userId: string): Promise<AuthRole | null>
  findClientProfile(userId: string): Promise<ClientProfile | null>
  saveClientPhone(profile: ClientPhoneProfile): Promise<{ ok: boolean }>
}
