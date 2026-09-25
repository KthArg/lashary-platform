// Entry point público de la feature payments (ARCH-003). Único import cross-feature de toda la
// historia: audit, por su entry point — el puerto RecordAuditEvent que declara application/
// (ARCH-004: domain no importa otras features; application sí puede, por el entry point).

import { randomUUID } from 'node:crypto'
import { systemClock } from '@/shared/clock'
import type { Result } from '@/shared/result'
import { record as recordAuditEvent } from '@/features/audit'
import { exemptClient as exemptClientUseCase } from './application/exempt-client'
import { depositExemptionRepository } from './db/deposit-exemption-repository'
import type { ExemptClientInput } from './application/exempt-client'
import type { DepositExemptionView } from './domain/deposit-exemption'
import type {
  DepositExemptionValidationError,
  ClientAlreadyExempt,
} from './domain/errors'

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

export type { ExemptClientInput, DepositExemptionView }
export { ClientAlreadyExempt, DepositExemptionValidationError } from './domain/errors'
