import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import { aftercareStorageFailed } from '../domain/errors'
import { deliveryStateOf, type AdminAftercare } from '../domain/aftercare-message'
import type { ClientRecordAftercareRepository } from '../application/ports'
import { AFTERCARE_MESSAGES_TABLE } from './client-aftercare-repository'

export const CLIENT_RECORD_AFTERCARE_COLUMNS =
  'id, appointment_id, service_name, aftercare_text, client_note, status, last_channel, created_at'

const READ_FAILED = 'no se pudieron leer las indicaciones de la clienta'
const INVALID_ROWS = 'las indicaciones de la clienta llegaron con una forma inesperada'

const timestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)))

const clientRecordAftercareRowSchema = z.object({
  id: z.string(),
  appointment_id: z.string(),
  service_name: z.string(),
  aftercare_text: z.string(),
  client_note: z.string().nullable(),
  status: z.enum(['pending', 'claimed', 'sent', 'failed']),
  last_channel: z.enum(['whatsapp', 'email']).nullable(),
  created_at: timestampSchema,
})

type ClientRecordAftercareRow = z.infer<typeof clientRecordAftercareRowSchema>

const toAdminAftercare = (row: ClientRecordAftercareRow): AdminAftercare => ({
  id: row.id,
  appointmentId: row.appointment_id,
  serviceName: row.service_name,
  aftercareText: row.aftercare_text,
  clientNote: row.client_note,
  deliveryState: deliveryStateOf(row.status, row.last_channel),
  createdAt: new Date(row.created_at),
})

export function clientRecordAftercareRepository(db: SupabaseClient): ClientRecordAftercareRepository {
  return {
    async listForClient(clientId, limit) {
      const { data, error } = await db
        .from(AFTERCARE_MESSAGES_TABLE)
        .select(CLIENT_RECORD_AFTERCARE_COLUMNS)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit)
      if (error) return err(aftercareStorageFailed(READ_FAILED))
      const rows = z.array(clientRecordAftercareRowSchema).safeParse(data ?? [])
      if (!rows.success) return err(aftercareStorageFailed(INVALID_ROWS))
      return ok(rows.data.map(toAdminAftercare))
    },
  }
}
