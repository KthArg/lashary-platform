import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import type { ReminderChannelKind, ReminderSnapshot, ReminderStatus } from '../domain/reminder'
import type { ReminderRepository, ReminderUpsert, ReminderReschedule } from '../application/ports'

const TABLE = 'notifications_reminders'
const FAILED = 'repository-failed' as const

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

// db inyectable: el cron (sin cookies) pasa su propio cliente ya autenticado como staff.
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
      }).select().maybeSingle()
      // Ya existe un recordatorio para esta cita (notifications_reminders_one_per_appointment):
      // idempotente, no es un fallo.
      if (error && error.code !== '23505') return err(FAILED)
      return ok(undefined)
    },

    async listPending() {
      const { data, error } = await supabase.from(TABLE).select('*').eq('status', 'pending')
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

    async listDuePending(now: Date) {
      const { data, error } = await supabase.from(TABLE).select('*')
        .eq('status', 'pending').lte('send_at', now.toISOString())
      if (error || !data) return err(FAILED)
      return ok((data as ReminderRow[]).map(toSnapshot))
    },

    async markSent(id: string, channel: ReminderChannelKind, sentAt: Date) {
      const { error } = await supabase.from(TABLE).update({
        status: 'sent', last_channel: channel, sent_at: sentAt.toISOString(),
      }).eq('id', id)
      if (error) return err(FAILED)
      return ok(undefined)
    },

    async markRetry(id: string, attempts: number, lastError: string) {
      const { error } = await supabase.from(TABLE).update({ attempts, last_error: lastError }).eq('id', id)
      if (error) return err(FAILED)
      return ok(undefined)
    },

    async markExhausted(id: string, attempts: number, lastError: string) {
      const { error } = await supabase.from(TABLE)
        .update({ status: 'failed', attempts, last_error: lastError }).eq('id', id)
      if (error) return err(FAILED)
      return ok(undefined)
    },
  }
}
