import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '@/shared/result'
import type { ConfirmationRequest, ConfirmationRequestStatus } from '../domain/confirmation-request'
import type { ReminderChannelKind } from '../domain/reminder'
import type { ConfirmationRequestRepository } from '../application/ports'
import { CHANNEL_SEND_TIMEOUT_MS } from '../channels/send-timeout'

const TABLE = 'notifications_confirmation_requests'
const CLAIM_FUNCTION = 'notifications_claim_confirmation_requests'
const FAILED = 'repository-failed' as const
const NOT_CLAIMED = 'not-claimed' as const
const CLAIMED_STATUS: ConfirmationRequestStatus = 'claimed'
const PENDING_STATUS: ConfirmationRequestStatus = 'pending'
const SENT_STATUS: ConfirmationRequestStatus = 'sent'
const EXHAUSTED_STATUS: ConfirmationRequestStatus = 'failed'

const CLAIM_TTL_MINUTES = 10
const CLAIM_TTL_MS = CLAIM_TTL_MINUTES * 60_000
const CHANNELS_PER_REQUEST = 2
const WORST_CASE_MS_PER_REQUEST = CHANNEL_SEND_TIMEOUT_MS * CHANNELS_PER_REQUEST
const CLAIM_TTL_SAFETY_MARGIN = 2
const CLAIM_BATCH_SIZE = Math.floor(CLAIM_TTL_MS / WORST_CASE_MS_PER_REQUEST / CLAIM_TTL_SAFETY_MARGIN)

interface ConfirmationRequestRow {
  id: string
  appointment_id: string
  client_id: string
  starts_at: string
  service_name: string
  status: ConfirmationRequestStatus
  attempts: number
  last_channel: ReminderChannelKind | null
}

const toConfirmationRequest = (row: ConfirmationRequestRow): ConfirmationRequest => ({
  id: row.id,
  appointmentId: row.appointment_id,
  clientId: row.client_id,
  startsAt: new Date(row.starts_at),
  serviceName: row.service_name,
  status: row.status,
  attempts: row.attempts,
  lastChannel: row.last_channel,
})

export function confirmationRequestRepository(db: SupabaseClient): ConfirmationRequestRepository {
  const updateClaimed = async (id: string, fields: Record<string, unknown>) => {
    const { data, error } = await db.from(TABLE).update(fields).eq('id', id).eq('status', CLAIMED_STATUS).select('id')
    if (error) return err(FAILED)
    return data && data.length > 0 ? ok(undefined) : err(NOT_CLAIMED)
  }

  return {
    async claimPending(now) {
      const { data, error } = await db.rpc(CLAIM_FUNCTION, {
        p_now: now.toISOString(),
        p_batch_size: CLAIM_BATCH_SIZE,
        p_claim_ttl_minutes: CLAIM_TTL_MINUTES,
      })
      if (error) return err(FAILED)
      return ok(((data ?? []) as ConfirmationRequestRow[]).map(toConfirmationRequest))
    },

    async isStillClaimed(id) {
      const { data, error } = await db.from(TABLE).select('id').eq('id', id).eq('status', CLAIMED_STATUS)
      if (error) return err(FAILED)
      return ok(Boolean(data && data.length > 0))
    },

    releaseToPending: (id) => updateClaimed(id, { status: PENDING_STATUS, claimed_at: null }),

    markSent: (id, channel, sentAt) =>
      updateClaimed(id, { status: SENT_STATUS, last_channel: channel, sent_at: sentAt.toISOString() }),

    markRetry: (id, attempts, error) =>
      updateClaimed(id, { status: PENDING_STATUS, claimed_at: null, attempts, last_error: error }),

    markExhausted: (id, attempts, error) =>
      updateClaimed(id, { status: EXHAUSTED_STATUS, attempts, last_error: error }),
  }
}
