import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import { storageFailed } from '../domain/errors'
import { PENDING_APPROVAL_STATUS } from '../domain/appointment-decision.constants'
import type { PendingAppointmentsRepository } from '../application/ports'
import { APPOINTMENTS_TABLE } from './appointment-repository.constants'

type PendingAppointmentRow = {
  id: string
  starts_at: string
  ends_at: string
}

export function createSupabasePendingAppointmentsRepository(
  db: SupabaseClient,
): PendingAppointmentsRepository {
  return {
    async listPending() {
      const { data, error } = await db
        .from(APPOINTMENTS_TABLE)
        .select('id, starts_at, ends_at')
        .eq('status', PENDING_APPROVAL_STATUS)
        .order('starts_at', { ascending: true })

      if (error) return err(storageFailed(error.message))

      const rows = (data ?? []) as PendingAppointmentRow[]
      return ok(
        rows.map((row) => ({
          id: row.id,
          startsAtMs: Date.parse(row.starts_at),
          endsAtMs: Date.parse(row.ends_at),
        })),
      )
    },
  }
}
