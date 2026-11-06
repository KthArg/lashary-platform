import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '@/shared/result'
import { inboxStorageFailed } from '../domain/errors'
import type { InboxNotice, InboxNoticeKind } from '../domain/inbox-notice'
import type { InboxRepository } from '../application/ports'

export const INBOX_TABLE = 'notifications_admin_inbox'
export const INBOX_COLUMNS =
  'id, kind, appointment_id, client_name, service_name, starts_at, previous_starts_at, forfeited_deposit, read_at, created_at'
const MISSING_COUNT = 'la base no devolvió el conteo'

type InboxRow = {
  id: string
  kind: InboxNoticeKind
  appointment_id: string
  client_name: string
  service_name: string
  starts_at: string
  previous_starts_at: string | null
  forfeited_deposit: number | null
  read_at: string | null
  created_at: string
}

const toNotice = (row: InboxRow): InboxNotice => {
  const base = {
    id: row.id,
    appointmentId: row.appointment_id,
    clientName: row.client_name,
    serviceName: row.service_name,
    startsAt: new Date(row.starts_at),
    readAt: row.read_at ? new Date(row.read_at) : null,
    createdAt: new Date(row.created_at),
  }
  switch (row.kind) {
    case 'appointment_cancelled':
      return { ...base, kind: row.kind, forfeitedDeposit: Number(row.forfeited_deposit ?? 0) }
    case 'appointment_rescheduled':
      return { ...base, kind: row.kind, previousStartsAt: new Date(row.previous_starts_at ?? row.starts_at) }
    case 'booking_created':
      return { ...base, kind: row.kind }
  }
}

export function inboxRepository(db: SupabaseClient): InboxRepository {
  return {
    async listRecent({ offset, limit }) {
      const { data, error } = await db
        .from(INBOX_TABLE)
        .select(INBOX_COLUMNS)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + limit)
      if (error) return err(inboxStorageFailed(error.message))
      const rows = (data ?? []) as InboxRow[]
      return ok({ notices: rows.slice(0, limit).map(toNotice), hasMore: rows.length > limit })
    },

    async countUnread() {
      const { count, error } = await db
        .from(INBOX_TABLE)
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
      if (error) return err(inboxStorageFailed(error.message))
      if (count === null) return err(inboxStorageFailed(MISSING_COUNT))
      return ok(count)
    },

    async setReadAt(id, readAt) {
      const { data, error } = await db
        .from(INBOX_TABLE)
        .update({ read_at: readAt ? readAt.toISOString() : null })
        .eq('id', id)
        .select('id')
      if (error) return err(inboxStorageFailed(error.message))
      return ok({ updated: (data ?? []).length > 0 })
    },
  }
}
