import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuthRole } from '../domain/roles'
import type { AuthRepository, ClientPhoneProfile, ClientProfile } from '../application/ports'

export function createSupabaseAuthRepository(supabase: SupabaseClient): AuthRepository {
  return {
    async findRole(userId: string) {
      const { data } = await supabase
        .from('auth_user_roles')
        .select('role')
        .eq('user_id', userId)
        .single()
      return (data?.role as AuthRole | undefined) ?? null
    },

    async findClientProfile(userId: string) {
      const { data } = await supabase
        .from('clients_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      return (data as ClientProfile | null) ?? null
    },

    async saveClientPhone(profile: ClientPhoneProfile) {
      const { error } = await supabase.from('clients_profiles').upsert(
        {
          user_id: profile.userId,
          full_name: profile.fullName,
          email: profile.email,
          phone: profile.phone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      return { ok: !error }
    },

    async getCurrentUser() {
      const { data } = await supabase.auth.getUser()
      return data?.user ?? null
    },

    async signInWithPassword(credentials) {
      const { data, error } = await supabase.auth.signInWithPassword(credentials)
      if (error || !data?.user) return null
      return data.user
    },

    async signInWithGoogle(redirectTo: string) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      return { failed: Boolean(error), url: data?.url ?? null }
    },

    async signOut() {
      await supabase.auth.signOut()
    },
  }
}
