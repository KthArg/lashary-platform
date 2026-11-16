import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import { reapplicationCycleKey } from '../domain/reapplication-reminder'
import type { ReapplicationReminderRecord, ReapplicationReminderRepository } from '../application/ports'

const TABLE = 'notifications_reapplication_reminders'
const FAILED = 'repository-failed' as const
const CYCLE_CONFLICT_COLUMNS = 'client_id,technique_id,last_completed_at'

interface RecordRow {
  client_id: string
  technique_id: string
  last_completed_at: string
  status: 'sent' | 'failed'
  attempts: number
}

export function createSupabaseReapplicationReminderRepository(supabase: SupabaseClient): ReapplicationReminderRepository {
  return {
    async listRecords(clientIds) {
      if (clientIds.length === 0) return ok(new Map<string, ReapplicationReminderRecord>())

      const { data, error } = await supabase
        .from(TABLE)
        .select('client_id, technique_id, last_completed_at, status, attempts')
        .in('client_id', clientIds)
      if (error) return err(FAILED)

      const rows = (data ?? []) as RecordRow[]
      return ok(
        new Map(
          rows.map((row) => [
            reapplicationCycleKey(row.client_id, row.technique_id, new Date(row.last_completed_at)),
            { status: row.status, attempts: row.attempts },
          ]),
        ),
      )
    },

    async recordSent(input) {
      const { error } = await supabase.from(TABLE).upsert(
        {
          client_id: input.clientId,
          technique_id: input.techniqueId,
          technique_name: input.techniqueName,
          last_completed_at: input.lastCompletedAt.toISOString(),
          due_at: input.dueAt.toISOString(),
          status: 'sent',
          attempts: input.attempts,
          last_error: null,
          last_channel: input.channel,
          sent_at: input.sentAt.toISOString(),
          updated_at: input.sentAt.toISOString(),
        },
        { onConflict: CYCLE_CONFLICT_COLUMNS },
      )
      if (error) return err(FAILED)
      return ok(undefined)
    },

    async recordFailed(input) {
      const { error } = await supabase.from(TABLE).upsert(
        {
          client_id: input.clientId,
          technique_id: input.techniqueId,
          technique_name: input.techniqueName,
          last_completed_at: input.lastCompletedAt.toISOString(),
          due_at: input.dueAt.toISOString(),
          status: 'failed',
          attempts: input.attempts,
          last_error: input.error,
          sent_at: null,
          updated_at: input.failedAt.toISOString(),
        },
        { onConflict: CYCLE_CONFLICT_COLUMNS },
      )
      if (error) return err(FAILED)
      return ok(undefined)
    },
  }
}

export async function reapplicationReminderRepository(db?: SupabaseClient) {
  return createSupabaseReapplicationReminderRepository(db ?? (await createClient()))
}
