import { randomUUID } from 'node:crypto'
import { systemClock } from '@/shared/clock'
import type { Result } from '@/shared/result'
import { record as recordAuditEvent } from '@/features/audit'
import { exemptClient as exemptClientUseCase } from './application/exempt-client'
import { depositExemptionRepository } from './db/deposit-exemption-repository'
import type { ExemptClientInput } from './application/exempt-client'
import type { DepositExemptionView } from './domain/deposit-exemption'
import type { DepositExemptionValidationError, ClientAlreadyExempt } from './domain/errors'

export async function exemptClient(
  input: ExemptClientInput,
): Promise<
  Result<DepositExemptionView, DepositExemptionValidationError | ClientAlreadyExempt>
> {
  return exemptClientUseCase({
    repo: await depositExemptionRepository(),
    newId: () => randomUUID(),
    clock: systemClock,
    recordAuditEvent,
  })(input)
}

export type { ExemptClientInput, DepositExemptionView, ClientAlreadyExempt, DepositExemptionValidationError }
export { isClientAlreadyExempt, isDepositExemptionValidationError } from './domain/errors'
export { ExemptClientForm } from './ui/admin-exemptions/components/ExemptClientForm'
export { receiveLedgerExportRequest } from './http/ledger-export-handler'
export { LedgerExportForm } from './ui/admin-ledger-export/components/LedgerExportForm'
export {
  LEDGER_EXPORT_ERROR_PARAM,
  isLedgerExportErrorReason,
} from './ui/admin-ledger-export/constants/ledger-export-strings'
