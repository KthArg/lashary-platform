import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import { aftercareStorageFailed } from '../domain/errors'
import type { ClientAftercare } from '../domain/aftercare-message'
import type { ClientAftercareRepository } from '../application/ports'

export const AFTERCARE_MESSAGES_TABLE = 'notifications_aftercare_messages'
export const CLIENT_AFTERCARE_COLUMNS = 'id, appointment_id, service_name, aftercare_text, client_note, created_at'

const READ_FAILED = 'no se pudieron leer las indicaciones'
const INVALID_ROWS = 'las indicaciones llegaron con una forma inesperada'

const timestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)))

const clientAftercareRowSchema = z.object({
  id: z.string(),
  appointment_id: z.string(),
  service_name: z.string(),
  aftercare_text: z.string(),
  client_note: z.string().nullable(),
  created_at: timestampSchema,
})

type ClientAftercareRow = z.infer<typeof clientAftercareRowSchema>

const toClientAftercare = (row: ClientAftercareRow): ClientAftercare => ({
  id: row.id,
  appointmentId: row.appointment_id,
  serviceName: row.service_name,
  aftercareText: row.aftercare_text,
  clientNote: row.client_note,
  createdAt: new Date(row.created_at),
})

export function clientAftercareRepository(db: SupabaseClient): ClientAftercareRepository {
  return {
    async listRecent(limit) {
      const { data, error } = await db
        .from(AFTERCARE_MESSAGES_TABLE)
        .select(CLIENT_AFTERCARE_COLUMNS)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit)
      if (error) return err(aftercareStorageFailed(READ_FAILED))
      const rows = z.array(clientAftercareRowSchema).safeParse(data ?? [])
      if (!rows.success) return err(aftercareStorageFailed(INVALID_ROWS))
      return ok(rows.data.map(toClientAftercare))
    },
  }
}
