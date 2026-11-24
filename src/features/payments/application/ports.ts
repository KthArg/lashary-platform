import type { Result } from '@/shared/result'
import type { DepositExemption } from '../domain/deposit-exemption'
import type { ClientAlreadyExempt, LedgerExportTooLarge, PaymentsStorageFailed } from '../domain/errors'
import type { LedgerExportEntry } from '../domain/ledger-csv'
import type { LedgerRange } from '../domain/ledger-export-range'

export interface DepositExemptionRepository {
  save(exemption: DepositExemption): Promise<Result<void, ClientAlreadyExempt>>
}

export type RecordAuditEvent = (input: {
  actorId: string
  action: string
  entityType: string
  entityId: string
  payload?: Record<string, unknown>
}) => Promise<Result<unknown, unknown>>

export interface LedgerExportRepository {
  entriesIn(
    range: LedgerRange,
  ): Promise<Result<LedgerExportEntry[], LedgerExportTooLarge | PaymentsStorageFailed>>
}
