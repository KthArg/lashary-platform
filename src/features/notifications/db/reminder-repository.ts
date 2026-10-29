import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import type { ReminderChannelKind, ReminderSnapshot, ReminderStatus } from '../domain/reminder'
import type { ReminderRepository, ReminderUpsert, ReminderReschedule } from '../application/ports'
import { CHANNEL_SEND_TIMEOUT_MS } from '../channels/send-timeout'

const TABLE = 'notifications_reminders'
const CLAIM_FUNCTION = 'notifications_claim_due_reminders'
const RELEASE_EXPIRED_CLAIMS_FUNCTION = 'notifications_release_expired_claims'
const FAILED = 'repository-failed' as const
const DUPLICATE_KEY_CODE = '23505'

const CLAIM_TTL_MINUTES = 10
const CLAIM_TTL_MS = CLAIM_TTL_MINUTES * 60_000
const CHANNELS_PER_REMINDER = 2
const WORST_CASE_MS_PER_REMINDER = CHANNEL_SEND_TIMEOUT_MS * CHANNELS_PER_REMINDER
const CLAIM_TTL_SAFETY_MARGIN = 2
const CLAIM_BATCH_SIZE = Math.floor(CLAIM_TTL_MS / WORST_CASE_MS_PER_REMINDER / CLAIM_TTL_SAFETY_MARGIN)

const REMINDER_COLUMNS =
  'id, appointment_id, client_id, starts_at, technique_name, send_at, status, attempts, last_error, last_channel, sent_at'

interface ReminderRow {
  id: string
  appointment_id: string
  client_id: string
  starts_at: string
  technique_name: string
  send_at: string
  status: ReminderStatus
  attempts: number
  last_error: string | null
  last_channel: ReminderChannelKind | null
  sent_at: string | null
}

const toSnapshot = (row: ReminderRow): ReminderSnapshot => ({
  id: row.id,
  appointmentId: row.appointment_id,
  clientId: row.client_id,
  startsAt: new Date(row.starts_at),
  techniqueName: row.technique_name,
  sendAt: new Date(row.send_at),
  status: row.status,
  attempts: row.attempts,
  lastError: row.last_error,
  lastChannel: row.last_channel,
  sentAt: row.sent_at ? new Date(row.sent_at) : null,
})

export async function reminderRepository(db?: SupabaseClient): Promise<ReminderRepository> {
  const supabase = db ?? (await createClient())

  return {
    async insertIfAbsent(reminder: ReminderUpsert) {
      const { error } = await supabase.from(TABLE).insert({
        id: reminder.id,
        appointment_id: reminder.appointmentId,
        client_id: reminder.clientId,
        starts_at: reminder.startsAt.toISOString(),
        technique_name: reminder.techniqueName,
        send_at: reminder.sendAt.toISOString(),
      }).select(REMINDER_COLUMNS).maybeSingle()
      if (error) {
        if (error.code === DUPLICATE_KEY_CODE) return ok({ inserted: false })
        return err(FAILED)
      }
      return ok({ inserted: true })
    },

    async listPending() {
      const { data, error } = await supabase.from(TABLE).select(REMINDER_COLUMNS).eq('status', 'pending')
      if (error || !data) return err(FAILED)
      return ok((data as ReminderRow[]).map(toSnapshot))
    },

    async reschedulePending(reschedule: ReminderReschedule) {
      const { error } = await supabase.from(TABLE).update({
        starts_at: reschedule.startsAt.toISOString(),
        technique_name: reschedule.techniqueName,
        send_at: reschedule.sendAt.toISOString(),
      }).eq('appointment_id', reschedule.appointmentId).eq('status', 'pending')
      if (error) return err(FAILED)
      return ok(undefined)
    },

    async cancelPending(appointmentId: string) {
      const { error } = await supabase.from(TABLE).update({ status: 'cancelled' })
        .eq('appointment_id', appointmentId).eq('status', 'pending')
      if (error) return err(FAILED)
      return ok(undefined)
    },

    async claimDuePending(now: Date) {
      const { data, error } = await supabase.rpc(CLAIM_FUNCTION, {
        p_now: now.toISOString(),
        p_batch_size: CLAIM_BATCH_SIZE,
      })
      if (error || !data) return err(FAILED)
      return ok((data as ReminderRow[]).map(toSnapshot))
    },

    async releaseExpiredClaims(now: Date) {
      const { data, error } = await supabase.rpc(RELEASE_EXPIRED_CLAIMS_FUNCTION, {
        p_now: now.toISOString(),
        p_claim_ttl_minutes: CLAIM_TTL_MINUTES,
      })
      if (error || !data) return err(FAILED)
      return ok((data as ReminderRow[]).map(toSnapshot))
    },

    async releaseToPending(id: string) {
      const { error } = await supabase.from(TABLE)
        .update({ status: 'pending', claimed_at: null })
        .eq('id', id).eq('status', 'claimed')
      if (error) return err(FAILED)
      return ok(undefined)
    },

    async markSent(id: string, channel: ReminderChannelKind, sentAt: Date) {
      const { error } = await supabase.from(TABLE).update({
        status: 'sent', last_channel: channel, sent_at: sentAt.toISOString(),
      }).eq('id', id).eq('status', 'claimed')
      if (error) return err(FAILED)
      return ok(undefined)
    },

    async markRetry(id: string, attempts: number, lastError: string) {
      const { error } = await supabase.from(TABLE)
        .update({ status: 'pending', attempts, last_error: lastError })
        .eq('id', id).eq('status', 'claimed')
      if (error) return err(FAILED)
      return ok(undefined)
    },

    async markExhausted(id: string, attempts: number, lastError: string) {
      const { error } = await supabase.from(TABLE)
        .update({ status: 'failed', attempts, last_error: lastError })
        .eq('id', id).eq('status', 'claimed')
      if (error) return err(FAILED)
      return ok(undefined)
    },
  }
}
