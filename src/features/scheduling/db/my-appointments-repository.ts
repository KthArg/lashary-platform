import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import type { CancellableStatus } from '../domain/appointment-cancellation.constants'
import { storageFailed } from '../domain/errors'
import type { MyAppointment, MyAppointmentsRepository } from '../application/ports'
import { LIST_MY_APPOINTMENTS_FUNCTION, MY_APPOINTMENTS_LIMIT } from './my-appointments-repository.constants'

type MyAppointmentRow = {
  id: string
  starts_at: string
  ends_at: string
  technique_name: string
  status: CancellableStatus
  is_first_time: boolean | null
  service_price: number
  deposit_required: number
}

const toIso = (epochMs: number): string => new Date(epochMs).toISOString()

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
