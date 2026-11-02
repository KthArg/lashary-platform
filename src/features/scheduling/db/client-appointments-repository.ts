import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/server'
import { err, ok } from '@/shared/result'
import { storageFailed } from '../domain/errors'
import type {
  ClientAppointmentStatus,
  ClientAppointmentView,
  ClientAppointmentsRepository,
} from '../application/client-appointments-ports'
import { APPOINTMENTS_TABLE } from './appointment-repository.constants'
import { CLIENT_APPOINTMENT_COLUMNS, RANGE_NOT_SATISFIABLE_CODE } from './client-appointments-repository.constants'

type ClientAppointmentRow = {
  id: string
  starts_at: string
  status: ClientAppointmentStatus
  technique_name: string | null
  package_name: string | null
  deposit_required: number
  deposit_registered: number
}

const toClientAppointment = (row: ClientAppointmentRow): ClientAppointmentView => ({
  id: row.id,
  startsAtMs: Date.parse(row.starts_at),
  status: row.status,
  techniqueName: row.technique_name ?? row.package_name ?? '',
  depositRequired: row.deposit_required,
  depositRegistered: row.deposit_registered,
})

export function createSupabaseClientAppointmentsRepository(db: SupabaseClient): ClientAppointmentsRepository {
  async function countClientAppointments(clientId: string) {
    const { error, count } = await db
      .from(APPOINTMENTS_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
    if (error) return err(storageFailed(error.message))
    return ok({ items: [], total: count ?? 0 })
  }

  return {
    async listByClient({ clientId, offset, limit }) {
      const { data, error, count } = await db
        .from(APPOINTMENTS_TABLE)
        .select(CLIENT_APPOINTMENT_COLUMNS, { count: 'exact' })
        .eq('client_id', clientId)
        .order('starts_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error?.code === RANGE_NOT_SATISFIABLE_CODE) return countClientAppointments(clientId)
      if (error) return err(storageFailed(error.message))
      return ok({
        items: ((data ?? []) as ClientAppointmentRow[]).map(toClientAppointment),
        total: count ?? 0,
      })
    },
  }
}

export async function clientAppointmentsRepository(): Promise<ClientAppointmentsRepository> {
  return createSupabaseClientAppointmentsRepository(await createClient())
}
