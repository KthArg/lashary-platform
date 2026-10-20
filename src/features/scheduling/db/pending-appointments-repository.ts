import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import { storageFailed } from '../domain/errors'
import { PENDING_APPROVAL_STATUS } from '../domain/appointment-decision.constants'
import type { AppointmentChoice, PendingAppointmentsRepository } from '../application/ports'
import { APPOINTMENTS_TABLE, PENDING_APPOINTMENT_COLUMNS, PENDING_APPOINTMENTS_LIMIT } from './appointment-repository.constants'

type PendingAppointmentRow = {
  id: string
  starts_at: string
  ends_at: string
  technique_name: string | null
  is_first_time: boolean | null
  is_first_time_detected: boolean | null
  service_price: number | null
  deposit_required: number | null
}

function toChoice(row: PendingAppointmentRow): AppointmentChoice | null {
  if (
    row.technique_name === null ||
    row.is_first_time === null ||
    row.service_price === null ||
    row.deposit_required === null
  ) {
    return null
  }
  return {
    techniqueName: row.technique_name,
    isFirstTime: row.is_first_time,
    detectedFirstTime: row.is_first_time_detected,
    servicePrice: row.service_price,
    depositRequired: row.deposit_required,
  }
}

export function createSupabasePendingAppointmentsRepository(
  db: SupabaseClient,
): PendingAppointmentsRepository {
  return {
    async listPending() {
      const { data, error } = await db
        .from(APPOINTMENTS_TABLE)
        .select(PENDING_APPOINTMENT_COLUMNS)
        .eq('status', PENDING_APPROVAL_STATUS)
        .order('starts_at', { ascending: true })
        .limit(PENDING_APPOINTMENTS_LIMIT)

      if (error) return err(storageFailed(error.message))

      const rows = (data ?? []) as PendingAppointmentRow[]
      return ok(
        rows.map((row) => ({
          id: row.id,
          startsAtMs: Date.parse(row.starts_at),
          endsAtMs: Date.parse(row.ends_at),
          choice: toChoice(row),
        })),
      )
    },
  }
}
