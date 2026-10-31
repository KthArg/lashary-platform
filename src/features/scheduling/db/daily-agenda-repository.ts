import type { SupabaseClient } from '@supabase/supabase-js'
import { err, isErr, ok } from '@/shared/result'
import { storageFailed } from '../domain/errors'
import {
  AGENDA_APPOINTMENT_STATUSES,
  DAILY_AGENDA_LIMIT,
  type AgendaAppointmentStatus,
} from '../domain/daily-agenda.constants'
import type { DailyAgendaRepository } from '../application/ports'
import { APPOINTMENTS_TABLE, DAILY_AGENDA_COLUMNS } from './appointment-repository.constants'
import { fetchClientNames } from './client-names'

type DailyAgendaRow = {
  id: string
  status: AgendaAppointmentStatus
  starts_at: string
  ends_at: string
  client_id: string | null
  technique_name: string | null
  is_first_time: boolean | null
  deposit_required: number | null
  deposit_registered: number | null
}

export function createSupabaseDailyAgendaRepository(db: SupabaseClient): DailyAgendaRepository {
  return {
    async listBetween(fromMs, untilMs) {
      const { data, error } = await db
        .from(APPOINTMENTS_TABLE)
        .select(DAILY_AGENDA_COLUMNS)
        .in('status', [...AGENDA_APPOINTMENT_STATUSES])
        .gte('starts_at', new Date(fromMs).toISOString())
        .lt('starts_at', new Date(untilMs).toISOString())
        .order('starts_at', { ascending: true })
        .limit(DAILY_AGENDA_LIMIT + 1)

      if (error) return err(storageFailed(error.message))

      const rows = (data ?? []) as DailyAgendaRow[]
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
          techniqueName: row.technique_name,
          isFirstTime: row.is_first_time,
          depositRequired: row.deposit_required,
          depositRegistered: row.deposit_registered,
        })),
      )
    },
  }
}
