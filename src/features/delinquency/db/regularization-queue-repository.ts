import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { err, ok } from '@/shared/result'
import { delinquencyStorageFailed } from '../domain/errors'
import type { RegularizationQueueRepository } from '../application/ports'
import { UNEXPECTED_ROW } from './case-row'

export const REGULARIZATIONS_TABLE = 'delinquency_regularizations'
// Contrato de payments (docs/contracts/payments-api.md): el saldo de hoy de cada cita, de una vez (PERF-002).
export const APPOINTMENT_BALANCES_FUNCTION = 'payments_appointment_balances'

const QUEUE_COLUMNS = 'id, case_id, client_id, declared_amount, reference, receipt_path, created_at, delinquency_cases(appointment_id)'

const queueRowSchema = z.object({
  id: z.string().guid(),
  case_id: z.string().guid(),
  client_id: z.string().guid(),
  declared_amount: z.number().int().positive(),
  reference: z.string().nullable(),
  receipt_path: z.string(),
  created_at: z.string(),
  delinquency_cases: z.object({ appointment_id: z.string().guid() }),
})

const balanceRowSchema = z.object({ appointment_id: z.string().guid(), pending: z.number().int() })

// Lee con la sesión de la administradora: la RLS deja ver las solicitudes y el ledger solo a staff (SEC-001).
export function regularizationQueueRepository(db: SupabaseClient): RegularizationQueueRepository {
  return {
    async listPending(limit) {
      const { data, error } = await db
        .from(REGULARIZATIONS_TABLE)
        .select(QUEUE_COLUMNS)
        .eq('state', 'pending_approval')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(limit)
      if (error) return err(delinquencyStorageFailed(error.message))
      const rows = z.array(queueRowSchema).safeParse(data ?? [])
      if (!rows.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))
      if (rows.data.length === 0) return ok([])

      const appointmentIds = [...new Set(rows.data.map((row) => row.delinquency_cases.appointment_id))]
      const balances = await db.rpc(APPOINTMENT_BALANCES_FUNCTION, { p_appointment_ids: appointmentIds })
      if (balances.error) return err(delinquencyStorageFailed(balances.error.message))
      const parsedBalances = z.array(balanceRowSchema).safeParse(balances.data ?? [])
      if (!parsedBalances.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))
      const pendingOf = new Map(parsedBalances.data.map((row) => [row.appointment_id, row.pending]))

      return ok(
        rows.data.map((row) => ({
          requestId: row.id,
          caseId: row.case_id,
          clientId: row.client_id,
          declaredAmount: row.declared_amount,
          reference: row.reference,
          receiptPath: row.receipt_path,
          pendingToday: pendingOf.get(row.delinquency_cases.appointment_id) ?? 0,
          submittedAt: new Date(row.created_at),
        })),
      )
    },
  }
}
