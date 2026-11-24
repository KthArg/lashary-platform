import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import type { InactiveReminderDelivery } from '../domain/inactive-reminder'
import type { InactiveReminderDeliveryRepository, RepositoryFailure } from '../application/ports'
import { CLAIM_BATCH_SIZE, CLAIM_TTL_MINUTES } from './claim-limits'

export const INACTIVE_REMINDERS_TABLE = 'notifications_inactive_reminders'
export const CLAIM_INACTIVE_REMINDERS_FUNCTION = 'notifications_claim_inactive_reminders'
const FAILED: RepositoryFailure = 'repository-failed'

const claimedRowSchema = z.object({
  id: z.string().guid(),
  client_id: z.string().guid(),
  attempts: z.number().int().min(0),
  full_name: z.string().nullable(),
  token: z.string().guid(),
})

type ClaimedRow = z.infer<typeof claimedRowSchema>

const toDelivery = (row: ClaimedRow): InactiveReminderDelivery => ({
  id: row.id,
  clientId: row.client_id,
  clientName: row.full_name ?? '',
  unsubscribeToken: row.token,
  attempts: row.attempts,
})

export function inactiveReminderDeliveryRepository(db: SupabaseClient): InactiveReminderDeliveryRepository {
  const updateClaimed = async (id: string, changes: Record<string, unknown>) => {
    const { error } = await db.from(INACTIVE_REMINDERS_TABLE).update(changes).eq('id', id).eq('status', 'claimed')
    return error ? err(FAILED) : ok(undefined)
  }

  return {
    async claimDue(now) {
      const { data, error } = await db.rpc(CLAIM_INACTIVE_REMINDERS_FUNCTION, {
        p_now: now.toISOString(),
        p_batch_size: CLAIM_BATCH_SIZE,
        p_claim_ttl_minutes: CLAIM_TTL_MINUTES,
      })
      if (error || !data) return err(FAILED)
      const rows = z.array(claimedRowSchema).safeParse(data)
      if (!rows.success) return err(FAILED)
      return ok(rows.data.map(toDelivery))
    },

    releaseToPending: (id) => updateClaimed(id, { status: 'pending', claimed_at: null }),

    markSent: (id, channel, sentAt) =>
      updateClaimed(id, { status: 'sent', last_channel: channel, sent_at: sentAt.toISOString() }),

    markRetry: (id, attempts, lastError) =>
      updateClaimed(id, { status: 'pending', claimed_at: null, attempts, last_error: lastError }),

    markExhausted: (id, attempts, lastError) =>
      updateClaimed(id, { status: 'failed', claimed_at: null, attempts, last_error: lastError }),
  }
}
