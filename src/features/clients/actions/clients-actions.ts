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
import type { ListClientsQuery, ListClientsResult, SaveClientResult } from '../types/client-actions.types'

const CLIENTS_TABLE = 'clients_profiles'
const CLIENTS_PATH = '/admin/clients'
const CLIENT_COLUMNS = 'id, full_name, phone, email, notes'

interface ClientRow { id: string; full_name: string; phone: string; email: string; notes: string | null }

const toRecord = (row: ClientRow): ClientRecord => ({
  id: row.id, fullName: row.full_name, phone: row.phone, email: row.email, notes: row.notes ?? '',
})

const readValues = (input: ClientFormValues): ClientFormValues => Object.fromEntries(
  Object.values(CLIENT_FIELD_KEYS).map((field) => [field, typeof input?.[field] === 'string' ? input[field] : '']),
) as unknown as ClientFormValues

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>
type PreparedRow =
  | { ok: true; row: Pick<ClientRow, 'full_name' | 'phone' | 'email' | 'notes'> }
  | { ok: false; error: string }

async function isPhoneTaken(supabase: SupabaseServerClient, phone: string, excludeId?: string): Promise<boolean | null> {
  const digits = phone.replace(/\D/g, '').slice(-CLIENT_PHONE_FORMAT.localDigits)
  const { data, error } = await supabase.from(CLIENTS_TABLE).select('id, phone').like('phone', `%${digits.split('').join('%')}%`)
  if (error || !data) return null
  return (data as Pick<ClientRow, 'id' | 'phone'>[])
    .some((row) => (excludeId === undefined || row.id !== excludeId) && normalizePhone(row.phone) === phone)
}

async function prepareRow(supabase: SupabaseServerClient, input: ClientFormValues, excludeId?: string): Promise<PreparedRow> {
  const values = readValues(input)
  if (hasClientFormErrors(validateClientForm(values))) return { ok: false, error: CLIENTS_ERROR_MESSAGES.formHasErrors }
  const phone = normalizePhone(values.phone)
  const taken = await isPhoneTaken(supabase, phone, excludeId)
  if (taken === null) return { ok: false, error: CLIENTS_ERROR_MESSAGES.saveFailed }
  if (taken) return { ok: false, error: CLIENTS_ERROR_MESSAGES.phoneTaken }
  return { ok: true, row: { full_name: values.fullName.trim(), phone, email: values.email.trim(), notes: values.notes.trim() || null } }
}

export async function createClientAction(input: ClientFormValues): Promise<SaveClientResult> {
  await requireAdminSession()
  const supabase = await createClient()
  const prepared = await prepareRow(supabase, input)
  if (!prepared.ok) return prepared

  const { data, error } = await supabase.from(CLIENTS_TABLE).insert({ ...prepared.row, phone_verified: true })
    .select(CLIENT_COLUMNS).single()
  if (error || !data) return { ok: false, error: CLIENTS_ERROR_MESSAGES.saveFailed }

  revalidatePath(CLIENTS_PATH)
  return { ok: true, client: toRecord(data as ClientRow) }
}

export async function updateClientAction(id: string, input: ClientFormValues): Promise<SaveClientResult> {
  await requireAdminSession()
  if (typeof id !== 'string' || !id) return { ok: false, error: CLIENTS_ERROR_MESSAGES.clientNotFound }
  const supabase = await createClient()
  const prepared = await prepareRow(supabase, input, id)
  if (!prepared.ok) return prepared

  const { data, error } = await supabase.from(CLIENTS_TABLE)
    .update({ ...prepared.row, updated_at: new Date().toISOString() })
    .eq('id', id).select(CLIENT_COLUMNS).maybeSingle()
  if (error) return { ok: false, error: CLIENTS_ERROR_MESSAGES.saveFailed }
  if (!data) return { ok: false, error: CLIENTS_ERROR_MESSAGES.clientNotFound }

  revalidatePath(CLIENTS_PATH)
  return { ok: true, client: toRecord(data as ClientRow) }
}

const readPage = (page: unknown): number => (Number.isInteger(page) && (page as number) > 0 ? (page as number) : 0)

const readPageSize = (pageSize: unknown): number =>
  (CLIENTS_LIST_LIMITS.pageSizes as readonly number[]).includes(pageSize as number)
    ? (pageSize as number)
    : CLIENTS_LIST_LIMITS.defaultPageSize

const toNamePattern = (name: unknown): string | null => {
  if (typeof name !== 'string') return null
  const term = name.trim().slice(0, CLIENTS_LIST_LIMITS.nameFilterMaxLength).replace(/\*/g, '').replace(/[\\%_]/g, '\\$&')
  return term ? `%${term}%` : null
}

export async function listClientsAction(query: ListClientsQuery = {}): Promise<ListClientsResult> {
  await requireAdminSession()
  const page = readPage(query?.page)
  const pageSize = readPageSize(query?.pageSize)
  const namePattern = toNamePattern(query?.name)
  const from = page * pageSize

  const supabase = await createClient()
  let request = supabase.from(CLIENTS_TABLE).select(CLIENT_COLUMNS, { count: 'exact' })
  if (namePattern) request = request.ilike('full_name', namePattern)
  const { data, error, count } = await request.order('created_at', { ascending: false }).range(from, from + pageSize - 1)

  if (error || !data || count === null) return { ok: false, error: CLIENTS_ERROR_MESSAGES.loadFailed }
  return { ok: true, clients: (data as ClientRow[]).map(toRecord), total: count, page, pageSize }
}
