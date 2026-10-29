import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import type { CancellableStatus } from '../domain/appointment-cancellation.constants'
import { storageFailed } from '../domain/errors'
import type { HeldSchedule, MyAppointment, MyAppointmentsRepository } from '../application/ports'
import { LIST_MY_APPOINTMENTS_FUNCTION, MY_APPOINTMENTS_LIMIT } from './my-appointments-repository.constants'

type MyAppointmentRow = {
  id: string
  starts_at: string
  ends_at: string
  technique_name: string
  status: CancellableStatus
  is_first_time: boolean
  service_price: number
  deposit_required: number
  held_starts_at: string | null
  held_ends_at: string | null
}

const toIso = (epochMs: number): string => new Date(epochMs).toISOString()

function toHeldSchedule(row: MyAppointmentRow): HeldSchedule | null {
  if (!row.held_starts_at || !row.held_ends_at) return null
  return { startsAtMs: Date.parse(row.held_starts_at), endsAtMs: Date.parse(row.held_ends_at) }
}

function toMyAppointment(row: MyAppointmentRow): MyAppointment {
  return {
    id: row.id,
    startsAtMs: Date.parse(row.starts_at),
    endsAtMs: Date.parse(row.ends_at),
    techniqueName: row.technique_name,
    status: row.status,
    isFirstTime: row.is_first_time,
    servicePrice: Number(row.service_price),
    depositRequired: Number(row.deposit_required),
    heldSchedule: toHeldSchedule(row),
  }
}

export function createSupabaseMyAppointmentsRepository(db: SupabaseClient): MyAppointmentsRepository {
  return {
    async listUpcoming(nowMs) {
      const { data, error } = await db.rpc(LIST_MY_APPOINTMENTS_FUNCTION, {
        p_now: toIso(nowMs),
        p_limit: MY_APPOINTMENTS_LIMIT,
      })

      if (error) return err(storageFailed(error.message))
      return ok(((data ?? []) as MyAppointmentRow[]).map(toMyAppointment))
    },
  }
}
