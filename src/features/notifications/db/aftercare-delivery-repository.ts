import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import { AFTERCARE_NOTE_MAX_LENGTH, type AftercareMessage } from '../domain/aftercare-message'
import type { AftercareDeliveryRepository, RepositoryFailure } from '../application/ports'
import { CLAIM_BATCH_SIZE, CLAIM_TTL_MINUTES } from './claim-limits'

export const AFTERCARE_MESSAGES_TABLE = 'notifications_aftercare_messages'
export const CLAIM_AFTERCARE_MESSAGES_FUNCTION = 'notifications_claim_aftercare_messages'
const FAILED: RepositoryFailure = 'repository-failed'

const timestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)))

const aftercareMessageRowSchema = z.object({
  id: z.string(),
  appointment_id: z.string(),
  client_id: z.string(),
  service_name: z.string(),
  aftercare_text: z.string(),
  client_note: z.string().max(AFTERCARE_NOTE_MAX_LENGTH).nullable(),
  attempts: z.number().int().min(0),
  created_at: timestampSchema,
})

type AftercareMessageRow = z.infer<typeof aftercareMessageRowSchema>

const toMessage = (row: AftercareMessageRow): AftercareMessage => ({
  id: row.id,
  appointmentId: row.appointment_id,
  clientId: row.client_id,
  serviceName: row.service_name,
  aftercareText: row.aftercare_text,
  clientNote: row.client_note,
  attempts: row.attempts,
  createdAt: new Date(row.created_at),
})

export function aftercareDeliveryRepository(db: SupabaseClient): AftercareDeliveryRepository {
  const updateClaimed = async (id: string, changes: Record<string, unknown>) => {
    const { error } = await db.from(AFTERCARE_MESSAGES_TABLE).update(changes).eq('id', id).eq('status', 'claimed')
    return error ? err(FAILED) : ok(undefined)
  }

  return {
    async claimDue(now) {
      const { data, error } = await db.rpc(CLAIM_AFTERCARE_MESSAGES_FUNCTION, {
        p_now: now.toISOString(),
        p_batch_size: CLAIM_BATCH_SIZE,
        p_claim_ttl_minutes: CLAIM_TTL_MINUTES,
      })
      if (error || !data) return err(FAILED)
      const rows = z.array(aftercareMessageRowSchema).safeParse(data)
      if (!rows.success) return err(FAILED)
      return ok(rows.data.map(toMessage))
    },

    releaseToPending: (id) => updateClaimed(id, { status: 'pending', claimed_at: null }),

    markSent: (id, channel, sentAt) =>
      updateClaimed(id, { status: 'sent', last_channel: channel, sent_at: sentAt.toISOString() }),

    markRetry: (id, attempts, lastError) => updateClaimed(id, { status: 'pending', attempts, last_error: lastError }),

    markExhausted: (id, attempts, lastError) => updateClaimed(id, { status: 'failed', attempts, last_error: lastError }),
  }
}
