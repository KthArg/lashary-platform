import { z } from 'zod'
import { CASE_STATES, type DelinquencyCase } from '../domain/delinquency-case'

export const CASE_COLUMNS = 'id, client_id, appointment_id, pending, state, detected_at, decided_at'

export const UNEXPECTED_ROW = 'la base devolvió una fila con una forma inesperada'

export const caseRowSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  appointment_id: z.string().uuid(),
  pending: z.number().int().positive(),
  state: z.enum(CASE_STATES),
  detected_at: z.string(),
  decided_at: z.string().nullable(),
})

export type CaseRow = z.infer<typeof caseRowSchema>

export const toCase = (row: CaseRow): DelinquencyCase => ({
  id: row.id,
  clientId: row.client_id,
  appointmentId: row.appointment_id,
  pending: row.pending,
  state: row.state,
  detectedAt: new Date(row.detected_at),
  decidedAt: row.decided_at ? new Date(row.decided_at) : null,
})
