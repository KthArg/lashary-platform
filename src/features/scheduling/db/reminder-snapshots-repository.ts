import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import { storageFailed } from '../domain/errors'
import type { AppointmentReminderSnapshot, ReminderSnapshotsRepository, ReminderSnapshotsWindow } from '../application/ports'
import { APPOINTMENTS_TABLE } from './appointment-repository.constants'

const ACTIVE_APPOINTMENT_STATUSES = ['approved', 'confirmed']

const REMINDER_SNAPSHOT_COLUMNS = 'id, client_id, starts_at, technique_name'

type ReminderSnapshotRow = {
  id: string
  client_id: string | null
  starts_at: string
  technique_name: string | null
}

function toSnapshot(row: ReminderSnapshotRow): AppointmentReminderSnapshot | null {
  if (row.client_id === null || row.technique_name === null) return null
  return {
    appointmentId: row.id,
    clientId: row.client_id,
    startsAt: new Date(row.starts_at),
    techniqueName: row.technique_name,
  }
}

export function createSupabaseReminderSnapshotsRepository(db: SupabaseClient): ReminderSnapshotsRepository {
  return {
    async listActiveStartingWithin(window: ReminderSnapshotsWindow) {
      const { data, error } = await db
        .from(APPOINTMENTS_TABLE)
        .select(REMINDER_SNAPSHOT_COLUMNS)
        .in('status', ACTIVE_APPOINTMENT_STATUSES)
        .gte('starts_at', window.from.toISOString())
        .lte('starts_at', window.to.toISOString())

      if (error) return err(storageFailed(error.message))
      const rows = (data ?? []) as ReminderSnapshotRow[]
      return ok(rows.map(toSnapshot).filter((snapshot): snapshot is AppointmentReminderSnapshot => snapshot !== null))
    },

    async getActiveById(appointmentId: string) {
      const { data, error } = await db
        .from(APPOINTMENTS_TABLE)
        .select(REMINDER_SNAPSHOT_COLUMNS)
        .eq('id', appointmentId)
        .in('status', ACTIVE_APPOINTMENT_STATUSES)
        .maybeSingle()

      if (error) return err(storageFailed(error.message))
      if (!data) return ok(null)
      return ok(toSnapshot(data as ReminderSnapshotRow))
    },
  }
}
