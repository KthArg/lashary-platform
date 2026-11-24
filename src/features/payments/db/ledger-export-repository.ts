import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createClient } from '@/shared/lib/supabase/server'
import { ok, err, type Result } from '@/shared/result'
import { LEDGER_KINDS, type LedgerExportEntry } from '../domain/ledger-csv'
import type { LedgerRange } from '../domain/ledger-export-range'
import {
  ledgerExportTooLarge,
  paymentsStorageFailed,
  type LedgerExportTooLarge,
  type PaymentsStorageFailed,
} from '../domain/errors'
import type { LedgerExportRepository } from '../application/ports'
import { clientNamesFor } from './ledger-client-names'

export const LEDGER_TABLE = 'payments_ledger_entries'
export const LEDGER_EXPORT_COLUMNS = 'client_id, appointment_id, kind, amount, created_at'
export const LEDGER_EXPORT_PAGE_SIZE = 1000
export const LEDGER_EXPORT_MAX_ENTRIES = 20000

const rowSchema = z.object({
  client_id: z.string(),
  appointment_id: z.string().nullable(),
  kind: z.enum(LEDGER_KINDS),
  amount: z.number().int(),
  created_at: z.string(),
})

type LedgerRow = z.infer<typeof rowSchema>

async function readRows(
  db: SupabaseClient,
  range: LedgerRange,
): Promise<Result<LedgerRow[], LedgerExportTooLarge | PaymentsStorageFailed>> {
  const rows: LedgerRow[] = []
  for (let start = 0; ; start += LEDGER_EXPORT_PAGE_SIZE) {
    const { data, error } = await db
      .from(LEDGER_TABLE)
      .select(LEDGER_EXPORT_COLUMNS)
      .gte('created_at', range.startsAt.toISOString())
      .lt('created_at', range.endsBefore.toISOString())
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(start, start + LEDGER_EXPORT_PAGE_SIZE - 1)
    if (error) return err(paymentsStorageFailed(error.message))
    const parsed = z.array(rowSchema).safeParse(data ?? [])
    if (!parsed.success) return err(paymentsStorageFailed('respuesta inesperada del ledger'))
    rows.push(...parsed.data)
    if (rows.length > LEDGER_EXPORT_MAX_ENTRIES) return err(ledgerExportTooLarge(LEDGER_EXPORT_MAX_ENTRIES))
    if (parsed.data.length < LEDGER_EXPORT_PAGE_SIZE) return ok(rows)
  }
}

export function createSupabaseLedgerExportRepository(db: SupabaseClient): LedgerExportRepository {
  return {
    async entriesIn(range) {
      const rows = await readRows(db, range)
      if (!rows.ok) return rows
      const names = await clientNamesFor(
        db,
        rows.value.map((row) => row.client_id),
      )
      if (!names.ok) return names
      return ok(
        rows.value.map(
          (row): LedgerExportEntry => ({
            createdAt: new Date(row.created_at),
            clientName: names.value.get(row.client_id) ?? row.client_id,
            appointmentId: row.appointment_id,
            kind: row.kind,
            amount: row.amount,
          }),
        ),
      )
    },
  }
}

export async function ledgerExportRepository(): Promise<LedgerExportRepository> {
  return createSupabaseLedgerExportRepository(await createClient())
}
