'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { CLIENT_FIELD_KEYS, CLIENT_PHONE_FORMAT, CLIENTS_LIST_LIMITS } from '../constants/client-form'
import { CLIENTS_ERROR_MESSAGES } from '../constants/clients-strings'
import { hasClientFormErrors, validateClientForm } from '../validation/validate-client-form'
import { normalizePhone } from '../validation/normalize-phone'
import type { ClientFormValues } from '../types/client-form.types'
import type { ClientRecord } from '../types/client.types'
import type { ListClientsResult, SaveClientResult } from '../types/client-actions.types'

const CLIENTS_TABLE = 'clients_profiles'
const CLIENTS_PATH = '/admin/clients'
// PERF-005: solo las columnas que la pantalla lee.
const CLIENT_COLUMNS = 'id, full_name, phone, email, notes'

interface ClientRow { id: string; full_name: string; phone: string; email: string; notes: string | null }

const toRecord = (row: ClientRow): ClientRecord => ({
  id: row.id, fullName: row.full_name, phone: row.phone, email: row.email, notes: row.notes ?? '',
})

// Lo que llega del navegador no es confiable ni en su forma: un campo ausente no debe tumbar la validacion.
const readValues = (input: ClientFormValues): ClientFormValues => Object.fromEntries(
  Object.values(CLIENT_FIELD_KEYS).map((field) => [field, typeof input?.[field] === 'string' ? input[field] : '']),
) as unknown as ClientFormValues

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * US-CLI-05 criterio 3: el telefono identifica a la clienta. Se busca por los digitos en orden y se
 * confirma normalizando, porque `auth` guarda telefonos sin normalizar (`+506 8888 7777`).
 * Devuelve null si la consulta falla: sin saberlo, no se inserta.
 */
async function isPhoneTaken(supabase: SupabaseServerClient, phone: string): Promise<boolean | null> {
  const digits = phone.replace(/\D/g, '').slice(-CLIENT_PHONE_FORMAT.localDigits)
  const { data, error } = await supabase.from(CLIENTS_TABLE).select('phone').like('phone', `%${digits.split('').join('%')}%`)
  if (error || !data) return null
  return (data as Pick<ClientRow, 'phone'>[]).some((row) => normalizePhone(row.phone) === phone)
}

/**
 * US-CLI-05 criterios 1, 3 y 4. El borde de la feature (DOM-007): la validacion del navegador es ayuda,
 * esta es la que cuenta. `requireAdminSession` es el mensaje amable; la frontera real es RLS (SEC-001).
 */
export async function createClientAction(input: ClientFormValues): Promise<SaveClientResult> {
  await requireAdminSession()
  const values = readValues(input)
  if (hasClientFormErrors(validateClientForm(values))) return { ok: false, error: CLIENTS_ERROR_MESSAGES.formHasErrors }

  const supabase = await createClient()
  const phone = normalizePhone(values.phone)
  const taken = await isPhoneTaken(supabase, phone)
  if (taken === null) return { ok: false, error: CLIENTS_ERROR_MESSAGES.saveFailed }
  if (taken) return { ok: false, error: CLIENTS_ERROR_MESSAGES.phoneTaken }

  // Criterio 4: la administradora la registra en persona, asi que el telefono nace verificado.
  const { data, error } = await supabase.from(CLIENTS_TABLE).insert({
    full_name: values.fullName.trim(), phone,
    email: values.email.trim(), notes: values.notes.trim() || null, phone_verified: true,
  }).select(CLIENT_COLUMNS).single()
  if (error || !data) return { ok: false, error: CLIENTS_ERROR_MESSAGES.saveFailed }

  revalidatePath(CLIENTS_PATH)
  return { ok: true, client: toRecord(data as ClientRow) }
}

/**
 * Lee una pagina de clientas, las mas recientes primero (PERF-002). La pagina 0 es la que muestra
 * /admin/clients; navegar paginas y filtrar es US-CLI-01. Un `page` invalido se trata como 0.
 */
export async function listClientsAction(page = 0): Promise<ListClientsResult> {
  await requireAdminSession()
  const from = (Number.isInteger(page) && page > 0 ? page : 0) * CLIENTS_LIST_LIMITS.pageSize
  const supabase = await createClient()
  const { data, error } = await supabase.from(CLIENTS_TABLE).select(CLIENT_COLUMNS)
    .order('created_at', { ascending: false }).range(from, from + CLIENTS_LIST_LIMITS.pageSize - 1)
  if (error || !data) return { ok: false, error: CLIENTS_ERROR_MESSAGES.loadFailed }
  return { ok: true, clients: (data as ClientRow[]).map(toRecord) }
}
