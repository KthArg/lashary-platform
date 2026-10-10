'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { AUTH_ERROR_MESSAGES } from '../constants/auth-strings'
import { validateClientPhone } from '../../domain/phone'
import { saveClientPhone } from '../../application/phone'
import { createSupabaseAuthRepository } from '../../db/auth-repository'

export async function updateClientPhoneAction(formData: FormData) {
  const phone = (formData.get('phone') as string)?.trim()
  const invalid = validateClientPhone(phone)
  if (invalid) return { error: AUTH_ERROR_MESSAGES[invalid] }

  const repository = createSupabaseAuthRepository(await createClient())
  const result = await saveClientPhone(repository, phone)

  if (result.kind === 'unauthenticated') return { error: AUTH_ERROR_MESSAGES.unauthenticated }
  if (result.kind === 'failed') return { error: AUTH_ERROR_MESSAGES.phoneSaveError }
  revalidatePath('/', 'layout')
  return { success: true }
}
