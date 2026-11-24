import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createClient } from '@/shared/lib/supabase/server'
import { err, ok } from '@/shared/result'
import { storageFailed } from '../domain/errors'
import type { AppointmentSummariesRepository, AppointmentSummary } from '../application/appointment-summaries-ports'
import { APPOINTMENTS_TABLE } from './appointment-repository.constants'

export const APPOINTMENT_SUMMARY_COLUMNS = 'id, starts_at, technique_name, package_name'
export const UNEXPECTED_SUMMARY_ROW = 'la base devolvió una cita con una forma inesperada'

const appointmentSummaryRowSchema = z.object({
  id: z.string(),
  starts_at: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
  technique_name: z.string().nullable(),
  package_name: z.string().nullable(),
})

const rowToSummary = (row: z.infer<typeof appointmentSummaryRowSchema>): AppointmentSummary => ({
  id: row.id,
  startsAtMs: Date.parse(row.starts_at),
  serviceName: row.technique_name ?? row.package_name ?? null,
})

export function createSupabaseAppointmentSummariesRepository(
  db: SupabaseClient,
): AppointmentSummariesRepository {
  return {
    async findByIds(appointmentIds) {
      const { data, error } = await db
        .from(APPOINTMENTS_TABLE)
        .select(APPOINTMENT_SUMMARY_COLUMNS)
        .in('id', [...appointmentIds])
      if (error) return err(storageFailed(error.message))

      const parsed = z.array(appointmentSummaryRowSchema).safeParse(data ?? [])
      if (!parsed.success) return err(storageFailed(UNEXPECTED_SUMMARY_ROW))
      return ok(parsed.data.map(rowToSummary))
    },
  }
}

export async function appointmentSummariesRepository(): Promise<AppointmentSummariesRepository> {
  return createSupabaseAppointmentSummariesRepository(await createClient())
}
