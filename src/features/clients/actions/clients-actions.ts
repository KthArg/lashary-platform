'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { CLIENT_FIELD_KEYS } from '../constants/client-form'
import { CLIENTS_ERROR_MESSAGES } from '../constants/clients-strings'
import { hasClientFormErrors, validateClientForm } from '../validation/validate-client-form'
import { normalizePhone } from '../validation/normalize-phone'
import type { ClientFormValues } from '../types/client-form.types'
import type { SaveClientResult } from '../types/client-actions.types'

const CLIENTS_TABLE = 'clients_profiles'
const CLIENTS_PATH = '/admin/clients'
// PERF-005: solo las columnas que la pantalla lee.
const CLIENT_COLUMNS = 'id, full_name, phone, email, notes'

interface ClientRow { id: string; full_name: string; phone: string; email: string; notes: string | null }

// Lo que llega del navegador no es confiable ni en su forma: un campo ausente no debe tumbar la validacion.
const readValues = (input: ClientFormValues): ClientFormValues => Object.fromEntries(
  Object.values(CLIENT_FIELD_KEYS).map((field) => [field, typeof input?.[field] === 'string' ? input[field] : '']),
) as unknown as ClientFormValues

/**
 * US-CLI-05 criterios 1 y 4. El borde de la feature (DOM-007): la validacion del navegador es ayuda,
 * esta es la que cuenta. `requireAdminSession` es el mensaje amable; la frontera real es RLS (SEC-001).
 */
export async function createClientAction(input: ClientFormValues): Promise<SaveClientResult> {
  await requireAdminSession()
  const values = readValues(input)
  if (hasClientFormErrors(validateClientForm(values))) return { ok: false, error: CLIENTS_ERROR_MESSAGES.formHasErrors }

  const supabase = await createClient()
  // Criterio 4: la administradora la registra en persona, asi que el telefono nace verificado.
  const { data, error } = await supabase.from(CLIENTS_TABLE).insert({
    full_name: values.fullName.trim(), phone: normalizePhone(values.phone),
    email: values.email.trim(), notes: values.notes.trim() || null, phone_verified: true,
  }).select(CLIENT_COLUMNS).single()
  if (error || !data) return { ok: false, error: CLIENTS_ERROR_MESSAGES.saveFailed }

  revalidatePath(CLIENTS_PATH)
  const row = data as ClientRow
  return { ok: true, client: { id: row.id, fullName: row.full_name, phone: row.phone, email: row.email, notes: row.notes ?? '' } }
}
