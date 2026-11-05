import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import { clientNoticesStorageFailed } from '../domain/errors'
import type { ClientNotice } from '../domain/client-notice'
import type { ClientNoticesRepository } from '../application/ports'

export const CLIENT_NOTICES_TABLE = 'notifications_client_notices'
export const CLIENT_NOTICE_COLUMNS = 'id, kind, appointment_id, service_name, requested_starts_at, kept_starts_at, created_at'

const READ_FAILED = 'no se pudieron leer los avisos'
const INVALID_ROWS = 'los avisos llegaron con una forma inesperada'

const timestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)))

const clientNoticeRowSchema = z.object({
  id: z.string(),
  kind: z.enum(['reschedule_rejected', 'reschedule_expired']),
  appointment_id: z.string(),
  service_name: z.string(),
  requested_starts_at: timestampSchema,
  kept_starts_at: timestampSchema,
  created_at: timestampSchema,
})

type ClientNoticeRow = z.infer<typeof clientNoticeRowSchema>

const toClientNotice = (row: ClientNoticeRow): ClientNotice => ({
  id: row.id,
  kind: row.kind,
  appointmentId: row.appointment_id,
  serviceName: row.service_name,
  requestedStartsAt: new Date(row.requested_starts_at),
  keptStartsAt: new Date(row.kept_starts_at),
  createdAt: new Date(row.created_at),
})

export function clientNoticeRepository(db: SupabaseClient): ClientNoticesRepository {
  return {
    async listKeptFrom(now, limit) {
      const { data, error } = await db
        .from(CLIENT_NOTICES_TABLE)
        .select(CLIENT_NOTICE_COLUMNS)
        .gt('kept_starts_at', now.toISOString())
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit)
      if (error) return err(clientNoticesStorageFailed(READ_FAILED))
      const rows = z.array(clientNoticeRowSchema).safeParse(data ?? [])
      if (!rows.success) return err(clientNoticesStorageFailed(INVALID_ROWS))
      return ok(rows.data.map(toClientNotice))
    },
  }
}
