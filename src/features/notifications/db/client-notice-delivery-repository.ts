import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import type { ClientNoticeDelivery } from '../domain/client-notice'
import type { ClientNoticeDeliveryRepository, RepositoryFailure } from '../application/ports'
import { CLAIM_BATCH_SIZE, CLAIM_TTL_MINUTES } from './claim-limits'
import { CLIENT_NOTICES_TABLE } from './client-notice-repository'

export const CLAIM_CLIENT_NOTICES_FUNCTION = 'notifications_claim_client_notices'
const FAILED: RepositoryFailure = 'repository-failed'

const timestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)))

const clientNoticeDeliveryRowSchema = z.object({
  id: z.string(),
  kind: z.enum(['reschedule_rejected', 'reschedule_expired']),
  client_id: z.string(),
  service_name: z.string(),
  requested_starts_at: timestampSchema,
  kept_starts_at: timestampSchema,
  attempts: z.number().int().min(0),
})

type ClientNoticeDeliveryRow = z.infer<typeof clientNoticeDeliveryRowSchema>

const toDelivery = (row: ClientNoticeDeliveryRow): ClientNoticeDelivery => ({
  id: row.id,
  kind: row.kind,
  clientId: row.client_id,
  serviceName: row.service_name,
  requestedStartsAt: new Date(row.requested_starts_at),
  keptStartsAt: new Date(row.kept_starts_at),
  attempts: row.attempts,
})

export function clientNoticeDeliveryRepository(db: SupabaseClient): ClientNoticeDeliveryRepository {
  const updateClaimed = async (id: string, changes: Record<string, unknown>) => {
    const { error } = await db.from(CLIENT_NOTICES_TABLE).update(changes).eq('id', id).eq('status', 'claimed')
    return error ? err(FAILED) : ok(undefined)
  }

  return {
    async claimDue(now) {
      const { data, error } = await db.rpc(CLAIM_CLIENT_NOTICES_FUNCTION, {
        p_now: now.toISOString(),
        p_batch_size: CLAIM_BATCH_SIZE,
        p_claim_ttl_minutes: CLAIM_TTL_MINUTES,
      })
      if (error || !data) return err(FAILED)
      const rows = z.array(clientNoticeDeliveryRowSchema).safeParse(data)
      if (!rows.success) return err(FAILED)
      return ok(rows.data.map(toDelivery))
    },

    releaseToPending: (id) => updateClaimed(id, { status: 'pending', claimed_at: null }),

    markSent: (id, channel, sentAt) =>
      updateClaimed(id, { status: 'sent', last_channel: channel, sent_at: sentAt.toISOString() }),

    markRetry: (id, attempts, lastError) => updateClaimed(id, { status: 'pending', attempts, last_error: lastError }),

    markExhausted: (id, attempts, lastError) => updateClaimed(id, { status: 'failed', attempts, last_error: lastError }),
  }
}
