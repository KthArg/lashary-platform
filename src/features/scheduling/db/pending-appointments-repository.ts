import type { SupabaseClient } from '@supabase/supabase-js'
import { err, isErr, ok } from '@/shared/result'
import { storageFailed } from '../domain/errors'
import { PENDING_APPROVAL_STATUS } from '../domain/appointment-decision.constants'
import type { AppointmentChoice, HeldSchedule, PendingAppointmentsRepository } from '../application/ports'
import {
  APPOINTMENTS_TABLE,
  PENDING_APPOINTMENT_COLUMNS,
  PENDING_APPOINTMENTS_LIMIT,
} from './appointment-repository.constants'
import { fetchClientNames } from './client-names'

type PendingAppointmentRow = {
  id: string
  starts_at: string
  ends_at: string
  client_id: string | null
  technique_name: string | null
  package_name: string | null
  is_first_time: boolean | null
  is_first_time_detected: boolean | null
  service_price: number | null
  deposit_required: number | null
  previous_starts_at: string | null
  previous_ends_at: string | null
}

function toHeldSchedule(row: PendingAppointmentRow): HeldSchedule | null {
  if (!row.previous_starts_at || !row.previous_ends_at) return null
  return { startsAtMs: Date.parse(row.previous_starts_at), endsAtMs: Date.parse(row.previous_ends_at) }
}

// Una cita de técnica y una de paquete son las dos formas válidas del CHECK de snapshot
// (scheduling_appointments_booking_snapshot_complete): un paquete no tiene is_first_time, su nombre
// sale de package_name, y choice solo es null si la cita todavía no tiene ninguna reserva.
function toChoice(row: PendingAppointmentRow): AppointmentChoice | null {
  const serviceName = row.technique_name ?? row.package_name
  if (serviceName === null || row.service_price === null || row.deposit_required === null) {
    return null
  }
  return {
    techniqueName: serviceName,
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
      const names = await fetchClientNames(db, rows.map((row) => row.client_id))
      if (isErr(names)) return names

      return ok(
        rows.map((row) => ({
          id: row.id,
          startsAtMs: Date.parse(row.starts_at),
          endsAtMs: Date.parse(row.ends_at),
          clientName: row.client_id ? (names.value.get(row.client_id) ?? null) : null,
          choice: toChoice(row),
          heldSchedule: toHeldSchedule(row),
        })),
      )
    },
  }
}
