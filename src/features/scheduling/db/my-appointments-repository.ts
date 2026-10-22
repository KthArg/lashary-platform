import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import { CANCELLABLE_STATUSES, type CancellableStatus } from '../domain/appointment-cancellation.constants'
import { storageFailed } from '../domain/errors'
import type { MyAppointment, MyAppointmentsRepository } from '../application/ports'
import { APPOINTMENTS_TABLE } from './appointment-repository.constants'
import { MY_APPOINTMENT_COLUMNS, MY_APPOINTMENTS_LIMIT } from './my-appointments-repository.constants'

type MyAppointmentRow = {
  id: string
  starts_at: string
  ends_at: string
  technique_name: string
  status: CancellableStatus
  is_first_time: boolean
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
      const { data, error } = await db
        .from(APPOINTMENTS_TABLE)
        .select(MY_APPOINTMENT_COLUMNS)
        .in('status', [...CANCELLABLE_STATUSES])
        .gt('starts_at', toIso(nowMs))
        .not('client_id', 'is', null)
        .order('starts_at', { ascending: true })
        .limit(MY_APPOINTMENTS_LIMIT)

      if (error) return err(storageFailed(error.message))
      return ok(((data ?? []) as MyAppointmentRow[]).map(toMyAppointment))
    },
  }
}
