import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import { INACTIVE_REMINDER_STATUSES, type InactiveClient } from '../domain/inactive-reminder'
import { inactiveQueueEmpty, inactiveQueueNotAllowed, inactiveQueueTooMany } from '../domain/errors'
import type { InactiveClientsRepository, InactiveQueueFailure, RepositoryFailure } from '../application/ports'

export const INACTIVE_CLIENTS_FUNCTION = 'notifications_inactive_clients'
export const QUEUE_INACTIVE_REMINDERS_FUNCTION = 'notifications_queue_inactive_reminders'
const FAILED: RepositoryFailure = 'repository-failed'

const timestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)))

const inactiveClientRowSchema = z.object({
  client_id: z.string().guid(),
  full_name: z.string(),
  last_visit_at: timestampSchema.nullable(),
  opted_out: z.boolean(),
  last_reminder_status: z.enum(INACTIVE_REMINDER_STATUSES).nullable(),
  last_reminder_queued_at: timestampSchema.nullable(),
  last_reminder_sent_at: timestampSchema.nullable(),
})

type InactiveClientRow = z.infer<typeof inactiveClientRowSchema>

const queueOutcomeRowSchema = z.object({
  queued: z.number().int().min(0),
  already_queued: z.number().int().min(0),
  opted_out: z.number().int().min(0),
  recent: z.number().int().min(0),
  unknown: z.number().int().min(0),
})

const toDate = (value: string | null): Date | null => (value === null ? null : new Date(value))

const toInactiveClient = (row: InactiveClientRow): InactiveClient => ({
  clientId: row.client_id,
  fullName: row.full_name,
  lastVisitAt: toDate(row.last_visit_at),
  optedOut: row.opted_out,
  lastReminder:
    row.last_reminder_status === null || row.last_reminder_queued_at === null
      ? null
      : {
          status: row.last_reminder_status,
          queuedAt: new Date(row.last_reminder_queued_at),
          sentAt: toDate(row.last_reminder_sent_at),
        },
})

function queueFailureFor(message: string, maxClients: number): InactiveQueueFailure {
  if (message === 'notifications_not_admin') return inactiveQueueNotAllowed()
  if (message === 'notifications_inactive_no_clients') return inactiveQueueEmpty()
  if (message === 'notifications_inactive_too_many') return inactiveQueueTooMany(maxClients)
  return FAILED
}

export function inactiveClientsRepository(db: SupabaseClient): InactiveClientsRepository {
  return {
    async listPage({ since, offset, limit }) {
      const { data, error, count } = await db
        .rpc(INACTIVE_CLIENTS_FUNCTION, { p_since: since.toISOString() }, { count: 'exact' })
        .order('last_visit_at', { ascending: true, nullsFirst: true })
        .order('full_name')
        .order('client_id')
        .range(offset, offset + limit - 1)
      if (error || !data || count === null || count === undefined) return err(FAILED)
      const rows = z.array(inactiveClientRowSchema).safeParse(data)
      if (!rows.success) return err(FAILED)
      return ok({ clients: rows.data.map(toInactiveClient), total: count })
    },

    async queue(clientIds, limits) {
      const { data, error } = await db.rpc(QUEUE_INACTIVE_REMINDERS_FUNCTION, {
        p_client_ids: clientIds,
        p_max_clients: limits.maxClients,
        p_min_days_between: limits.minDaysBetween,
      })
      if (error) return err(queueFailureFor(error.message, limits.maxClients))
      const rows = z.array(queueOutcomeRowSchema).length(1).safeParse(data)
      if (!rows.success) return err(FAILED)
      const [row] = rows.data
      return ok({
        queued: row.queued,
        alreadyQueued: row.already_queued,
        optedOut: row.opted_out,
        recent: row.recent,
        unknown: row.unknown,
      })
    },
  }
}
