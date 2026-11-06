import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '@/shared/result'
import { clientNoticesStorageFailed } from '../domain/errors'
import type { ClientNotice, ClientNoticeKind } from '../domain/client-notice'
import type { ClientNoticesRepository } from '../application/ports'

export const CLIENT_NOTICES_TABLE = 'notifications_client_notices'
export const CLIENT_NOTICE_COLUMNS = 'id, kind, appointment_id, service_name, requested_starts_at, kept_starts_at, created_at'

type ClientNoticeRow = {
  id: string
  kind: ClientNoticeKind
  appointment_id: string
  service_name: string
  requested_starts_at: string
  kept_starts_at: string
  created_at: string
}

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
      if (error) return err(clientNoticesStorageFailed(error.message))
      return ok(((data ?? []) as ClientNoticeRow[]).map(toClientNotice))
    },
  }
}
