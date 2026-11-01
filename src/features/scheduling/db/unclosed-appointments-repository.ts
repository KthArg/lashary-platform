import type { SupabaseClient } from '@supabase/supabase-js'
import { err, isErr, ok } from '@/shared/result'
import { CLOSABLE_STATUSES, type ClosableStatus } from '../domain/appointment-closing.constants'
import { storageFailed } from '../domain/errors'
import type { UnclosedAppointmentsRepository } from '../application/closing-ports'
import { APPOINTMENTS_TABLE } from './appointment-repository.constants'
import { fetchClientNames } from './client-names'
import { UNCLOSED_APPOINTMENT_COLUMNS } from './unclosed-appointments-repository.constants'

type UnclosedRow = {
  id: string
  status: ClosableStatus
  starts_at: string
  ends_at: string
  client_id: string | null
  technique_id: string | null
  is_first_time: boolean | null
  technique_name: string | null
  service_price: number | null
  deposit_registered: number
}

export function createSupabaseUnclosedAppointmentsRepository(db: SupabaseClient): UnclosedAppointmentsRepository {
  return {
    async listUnclosed(nowMs, limit) {
      const { data, error } = await db
        .from(APPOINTMENTS_TABLE)
        .select(UNCLOSED_APPOINTMENT_COLUMNS)
        .in('status', [...CLOSABLE_STATUSES])
        .lte('ends_at', new Date(nowMs).toISOString())
        .order('starts_at', { ascending: true })
        .limit(limit)

      if (error) return err(storageFailed(error.message))

      const rows = (data ?? []) as UnclosedRow[]
      const names = await fetchClientNames(db, rows.map((row) => row.client_id))
      if (isErr(names)) return names

      return ok(
        rows.map((row) => ({
          id: row.id,
          status: row.status,
          startsAtMs: Date.parse(row.starts_at),
          endsAtMs: Date.parse(row.ends_at),
          clientId: row.client_id,
          clientName: row.client_id ? (names.value.get(row.client_id) ?? null) : null,
          techniqueId: row.technique_id,
          isFirstTime: row.is_first_time,
          techniqueName: row.technique_name,
          servicePrice: row.service_price === null ? null : Number(row.service_price),
          depositRegistered: Number(row.deposit_registered),
        })),
      )
    },
  }
}
