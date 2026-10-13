'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { AUTH_ERROR_MESSAGES } from '../constants/auth-strings'
import { validateClientPhone } from '../../domain/phone'
import { clientDisplayName } from '../../application/session'
import { createSupabaseAuthRepository } from '../../db/auth-repository'

export async function updateClientPhoneAction(formData: FormData) {
  const phone = (formData.get('phone') as string)?.trim()
  const invalid = validateClientPhone(phone)
  if (invalid) return { error: AUTH_ERROR_MESSAGES[invalid] }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: AUTH_ERROR_MESSAGES.unauthenticated }

  const saved = await createSupabaseAuthRepository(supabase).saveClientPhone({
    userId: user.id,
    fullName: clientDisplayName(user),
    email: user.email || '',
    phone,
  })

  if (!saved.ok) return { error: AUTH_ERROR_MESSAGES.phoneSaveError }
  revalidatePath('/', 'layout')
  return { success: true }
}
