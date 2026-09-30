import { ok, err, isErr, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import {
  DepositExemption,
  type DepositExemptionView,
} from '../domain/deposit-exemption'
import {
  ClientAlreadyExempt,
  type DepositExemptionValidationError,
} from '../domain/errors'
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

async function saveOrConflict(
  repo: DepositExemptionRepository,
  exemption: DepositExemption,
): Promise<Result<void, ClientAlreadyExempt>> {
  try {
    await repo.save(exemption)
    return ok(undefined)
  } catch (error) {
    if (error instanceof ClientAlreadyExempt) return err(error)
    throw error
  }
}

export const exemptClient =
  (deps: ExemptClientDeps) =>
  async (
    input: ExemptClientInput,
  ): Promise<
    Result<DepositExemptionView, DepositExemptionValidationError | ClientAlreadyExempt>
  > => {
    const built = DepositExemption.create(deps.newId(), {
      clientId: input.clientId,
      exemptedBy: input.exemptedBy,
      reason: input.reason,
      createdAt: deps.clock(),
    })
    if (isErr(built)) return built

    const saved = await saveOrConflict(deps.repo, built.value)
    if (isErr(saved)) return saved

    await deps.recordAuditEvent({
      actorId: input.exemptedBy,
      action: 'payments.deposit_exemption.granted',
      entityType: 'clients_profile',
      entityId: input.clientId,
      payload: { reason: input.reason, exemptionId: built.value.id },
    })

    return ok(built.value.toView())
  }
