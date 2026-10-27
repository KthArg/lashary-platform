'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { AUTH_ERROR_MESSAGES } from '../constants/auth-strings'
import { validateClientPhone } from '../../domain/phone'
import { saveClientPhone } from '../../application/phone'
import { createSupabaseAuthRepository } from '../../db/auth-repository'
import type { PhoneRegistrationState } from '../client-login/types/phone-registration.types'

export async function updateClientPhoneAction(formData: FormData): Promise<PhoneRegistrationState> {
  const phone = (formData.get('phone') as string)?.trim()
  const invalid = validateClientPhone(phone)
  if (invalid) return { success: false, error: AUTH_ERROR_MESSAGES[invalid] }

  const repository = createSupabaseAuthRepository(await createClient())
  const result = await saveClientPhone(repository, phone)

  if (result.kind === 'unauthenticated') return { success: false, error: AUTH_ERROR_MESSAGES.unauthenticated }
  if (result.kind === 'failed') return { success: false, error: AUTH_ERROR_MESSAGES.phoneSaveError }
  revalidatePath('/', 'layout')
  return { success: true }
}
