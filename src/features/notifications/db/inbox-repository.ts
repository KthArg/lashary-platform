import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '@/shared/result'
import type { InboxNotice, InboxNoticeKind } from '../domain/inbox-notice'
import type { InboxRepository } from '../application/ports'

export const INBOX_TABLE = 'notifications_admin_inbox'
export const INBOX_COLUMNS = 'id, kind, appointment_id, client_name, service_name, starts_at, read_at, created_at'
const FAILED = 'repository-failed' as const

type InboxRow = {
  id: string
  kind: InboxNoticeKind
  appointment_id: string
  client_name: string
  service_name: string
  starts_at: string
  read_at: string | null
  created_at: string
}

const toNotice = (row: InboxRow): InboxNotice => ({
  id: row.id,
  kind: row.kind,
  appointmentId: row.appointment_id,
  clientName: row.client_name,
  serviceName: row.service_name,
  startsAt: new Date(row.starts_at),
  readAt: row.read_at ? new Date(row.read_at) : null,
  createdAt: new Date(row.created_at),
})

export function inboxRepository(db: SupabaseClient): InboxRepository {
  return {
    async listRecent(limit) {
      const { data, error } = await db
        .from(INBOX_TABLE)
        .select(INBOX_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) return err(FAILED)
      return ok(((data ?? []) as InboxRow[]).map(toNotice))
    },

    async countUnread() {
      const { count, error } = await db
        .from(INBOX_TABLE)
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
      if (error || count === null) return err(FAILED)
      return ok(count)
    },

    async setReadAt(id, readAt) {
      const { data, error } = await db
        .from(INBOX_TABLE)
        .update({ read_at: readAt ? readAt.toISOString() : null })
        .eq('id', id)
        .select('id')
      if (error) return err(FAILED)
      return ok({ updated: (data ?? []).length > 0 })
    },
  }
}
