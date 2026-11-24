import { ok, type Result } from '@/shared/result'
import { buildLedgerCsv } from '../domain/ledger-csv'
import { buildLedgerRange } from '../domain/ledger-export-range'
import type {
  InvalidLedgerRange,
  LedgerExportTooLarge,
  PaymentsStorageFailed,
} from '../domain/errors'
import type { LedgerExportRepository } from './ports'

export interface ExportLedgerInput {
  fromDate: string | null
  toDate: string | null
}

export interface LedgerExportFile {
  csv: string
  filename: string
}

export type ExportLedgerError = InvalidLedgerRange | LedgerExportTooLarge | PaymentsStorageFailed

export function exportLedger(deps: { repo: LedgerExportRepository }) {
  return async (input: ExportLedgerInput): Promise<Result<LedgerExportFile, ExportLedgerError>> => {
    const range = buildLedgerRange(input.fromDate, input.toDate)
    if (!range.ok) return range
    const entries = await deps.repo.entriesIn(range.value)
    if (!entries.ok) return entries
    return ok({
      csv: buildLedgerCsv(entries.value),
      filename: `ledger-${range.value.fromDate}-a-${range.value.toDate}.csv`,
    })
  }
}
