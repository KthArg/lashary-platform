'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { AUTH_ERROR_MESSAGES } from '../constants/auth-strings'

export async function updateClientPhoneAction(formData: FormData) {
  const phone = formData.get('phone') as string
  if (!phone || phone.trim().length < 8) return { error: AUTH_ERROR_MESSAGES.phoneMinLength }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: AUTH_ERROR_MESSAGES.unauthenticated }

  const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente'
  const email = user.email || ''

  const { error } = await supabase.from('clients_profiles').upsert({
    user_id: user.id, full_name: fullName, email: email,
    phone: phone.trim(), updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) return { error: AUTH_ERROR_MESSAGES.phoneSaveError }
  revalidatePath('/', 'layout')
  return { success: true }
}
