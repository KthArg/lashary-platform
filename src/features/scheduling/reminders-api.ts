import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/server'
import { createSupabaseReminderSnapshotsRepository } from './db/reminder-snapshots-repository'
import {
  listAppointmentsForReminders as listForReminders,
  getAppointmentForReminder as getForReminder,
} from './application/reminder-snapshots'
import type { ReminderSnapshotsWindow } from './application/ports'

export async function listAppointmentsForReminders(window: ReminderSnapshotsWindow, db?: SupabaseClient) {
  const repo = createSupabaseReminderSnapshotsRepository(db ?? (await createClient()))
  return listForReminders(repo, window)
}

export async function getAppointmentForReminder(appointmentId: string, db?: SupabaseClient) {
  const repo = createSupabaseReminderSnapshotsRepository(db ?? (await createClient()))
  return getForReminder(repo, appointmentId)
}
