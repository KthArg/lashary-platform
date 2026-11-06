import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '@/shared/result'
import type { ClientNoticeDelivery, ClientNoticeKind } from '../domain/client-notice'
import type { ClientNoticeDeliveryRepository, RepositoryFailure } from '../application/ports'
import { CHANNEL_SEND_TIMEOUT_MS } from '../channels/send-timeout'
import { CLIENT_NOTICES_TABLE } from './client-notice-repository'

export const CLAIM_CLIENT_NOTICES_FUNCTION = 'notifications_claim_client_notices'
const FAILED: RepositoryFailure = 'repository-failed'

export const CLIENT_NOTICE_CLAIM_TTL_MINUTES = 10
const CHANNELS_PER_NOTICE = 2
const CLAIM_TTL_SAFETY_MARGIN = 2
export const CLIENT_NOTICE_CLAIM_BATCH_SIZE = Math.floor(
  (CLIENT_NOTICE_CLAIM_TTL_MINUTES * 60_000) / (CHANNEL_SEND_TIMEOUT_MS * CHANNELS_PER_NOTICE) / CLAIM_TTL_SAFETY_MARGIN,
)

type ClientNoticeDeliveryRow = {
  id: string
  kind: ClientNoticeKind
  client_id: string
  service_name: string
  requested_starts_at: string
  kept_starts_at: string
  attempts: number
}

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
        p_batch_size: CLIENT_NOTICE_CLAIM_BATCH_SIZE,
        p_claim_ttl_minutes: CLIENT_NOTICE_CLAIM_TTL_MINUTES,
      })
      if (error || !data) return err(FAILED)
      return ok((data as ClientNoticeDeliveryRow[]).map(toDelivery))
    },

    releaseToPending: (id) => updateClaimed(id, { status: 'pending', claimed_at: null }),

    markSent: (id, channel, sentAt) =>
      updateClaimed(id, { status: 'sent', last_channel: channel, sent_at: sentAt.toISOString() }),

    markRetry: (id, attempts, lastError) => updateClaimed(id, { status: 'pending', attempts, last_error: lastError }),

    markExhausted: (id, attempts, lastError) => updateClaimed(id, { status: 'failed', attempts, last_error: lastError }),
  }
}
