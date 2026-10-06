import { ok, err } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import type { ClientRecord } from '../domain/client.types'
import type { ClientPhoneEntry, ClientRepository, ClientWriteModel } from '../application/ports'

const CLIENTS_TABLE = 'clients_profiles'
const CLIENT_COLUMNS = 'id, full_name, phone, email, notes'
const FAILED = 'repository-failed' as const

interface ClientRow { id: string; full_name: string; phone: string; email: string; notes: string | null }

const toRecord = (row: ClientRow): ClientRecord => ({
  id: row.id, fullName: row.full_name, phone: row.phone, email: row.email, notes: row.notes ?? '',
})

const toRow = (client: ClientWriteModel): Omit<ClientRow, 'id'> => ({
  full_name: client.fullName, phone: client.phone, email: client.email, notes: client.notes,
})

const toDigitsInOrderPattern = (digits: string): string => `%${digits.split('').join('%')}%`

const toLiteralNamePattern = (name: string | null): string | null => {
  if (name === null) return null
  const term = name.replace(/\*/g, '').replace(/[\\%_]/g, '\\$&')
  return term ? `%${term}%` : null
}

export async function clientRepository(): Promise<ClientRepository> {
  const supabase = await createClient()

  return {
    async findByPhoneDigits(digits) {
      const { data, error } = await supabase.from(CLIENTS_TABLE).select('id, phone').like('phone', toDigitsInOrderPattern(digits))
      if (error || !data) return err(FAILED)
      return ok(data as ClientPhoneEntry[])
    },

    async insertVerified(client) {
      const { data, error } = await supabase.from(CLIENTS_TABLE).insert({ ...toRow(client), phone_verified: true })
        .select(CLIENT_COLUMNS).single()
      if (error || !data) return err(FAILED)
      return ok(toRecord(data as ClientRow))
    },

    async update(id, client) {
      const { data, error } = await supabase.from(CLIENTS_TABLE)
        .update({ ...toRow(client), updated_at: new Date().toISOString() })
        .eq('id', id).select(CLIENT_COLUMNS).maybeSingle()
      if (error) return err(FAILED)
      return ok(data ? toRecord(data as ClientRow) : null)
    },

    async listPage({ offset, limit, name }) {
      const namePattern = toLiteralNamePattern(name)
      let request = supabase.from(CLIENTS_TABLE).select(CLIENT_COLUMNS, { count: 'exact' })
      if (namePattern) request = request.ilike('full_name', namePattern)
      const { data, error, count } = await request.order('created_at', { ascending: false }).range(offset, offset + limit - 1)
      if (error || !data || count === null) return err(FAILED)
      return ok({ clients: (data as ClientRow[]).map(toRecord), total: count })
    },
  }
}
