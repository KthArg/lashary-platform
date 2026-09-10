import { createClient } from '@/shared/lib/supabase/server'
import { CLIENTS_ERROR_MESSAGES } from '../constants/clients-strings'
import { CLIENTS_LIST_COLUMNS, CLIENTS_LIST_LIMIT } from '../constants/clients-query'
import type { ClientRecord } from '../types/client.types'
import type { ClientProfileRow, ClientsListResult } from '../types/client-row.types'

/**
 * US-CLI-05 criterio 2 — lectura real de public.clients_profiles.
 *
 * NO lleva 'use server': la unica consumidora es la pagina /admin/clients, que es Server Component
 * y la llama directo. Marcarla como server action la publicaria como endpoint invocable desde el
 * navegador sin que nadie lo necesite.
 *
 * Quien filtra de verdad es la politica `clients_profiles_select_admin` (SEC-001): con una sesion
 * que no es de administradora esta misma consulta devuelve cero filas, no un error.
 */
export async function listClients(): Promise<ClientsListResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clients_profiles')
    .select(CLIENTS_LIST_COLUMNS)
    .order('full_name', { ascending: true })
    .limit(CLIENTS_LIST_LIMIT)

  if (error) {
    return { ok: false, error: CLIENTS_ERROR_MESSAGES.clientsListLoadFailed }
  }

  return { ok: true, clients: (data ?? []).map(toClientRecord) }
}

/**
 * La base habla snake_case y admite `notes` nula; el formulario habla camelCase y su campo de notas
 * es un string. La traduccion vive aqui y no en el JSX: un `?? ''` regado por la pantalla es la
 * forma en que `null` termina renderizandose como la palabra "null".
 */
function toClientRecord(row: ClientProfileRow): ClientRecord {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    notes: row.notes ?? '',
  }
}
