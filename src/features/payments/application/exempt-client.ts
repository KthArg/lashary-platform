import { ok, isErr, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import {
  buildDepositExemption,
  depositExemptionToView,
  type DepositExemptionView,
} from '../domain/deposit-exemption'
import type {
  ClientAlreadyExempt,
  DepositExemptionValidationError,
} from '../domain/errors'
import {
  DEPOSIT_EXEMPTION_ENTITY_TYPE,
  DEPOSIT_EXEMPTION_GRANTED_ACTION,
} from './exempt-client.constants'
import type { DepositExemptionRepository, RecordAuditEvent } from './ports'

export type ExemptClientInput = {
  clientId: string
  exemptedBy: string
  reason: string
}

export type ExemptClientDeps = {
  repo: DepositExemptionRepository
  newId: () => string
  clock: Clock
  recordAuditEvent: RecordAuditEvent
}

export const exemptClient =
  (deps: ExemptClientDeps) =>
  async (
    input: ExemptClientInput,
  ): Promise<
    Result<DepositExemptionView, DepositExemptionValidationError | ClientAlreadyExempt>
  > => {
    const built = buildDepositExemption(deps.newId(), {
      clientId: input.clientId,
      exemptedBy: input.exemptedBy,
      reason: input.reason,
      createdAt: deps.clock(),
    })
    if (isErr(built)) return built

    const saved = await deps.repo.save(built.value)
    if (isErr(saved)) return saved

    const audited = await deps.recordAuditEvent({
      actorId: input.exemptedBy,
      action: DEPOSIT_EXEMPTION_GRANTED_ACTION,
      entityType: DEPOSIT_EXEMPTION_ENTITY_TYPE,
      entityId: input.clientId,
      payload: { reason: input.reason, exemptionId: built.value.id },
    })
    if (isErr(audited)) throw audited.error

    return ok(depositExemptionToView(built.value))
  }
