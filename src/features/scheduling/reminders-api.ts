import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/server'
import { createSupabaseReminderSnapshotsRepository } from './db/reminder-snapshots-repository'
import {
  listAppointmentsForReminders as listForReminders,
  getAppointmentForReminder as getForReminder,
} from './application/reminder-snapshots'
import type { ReminderSnapshotsWindow } from './application/ports'

// db inyectable: el cron de notifications (sin cookies, US-NOT-03) pasa su propio cliente ya
// autenticado como staff en vez del de sesión por cookies.
export async function listAppointmentsForReminders(window: ReminderSnapshotsWindow, db?: SupabaseClient) {
  const repo = createSupabaseReminderSnapshotsRepository(db ?? (await createClient()))
  return listForReminders(repo, window)
}

export async function getAppointmentForReminder(appointmentId: string, db?: SupabaseClient) {
  const repo = createSupabaseReminderSnapshotsRepository(db ?? (await createClient()))
  return getForReminder(repo, appointmentId)
}
