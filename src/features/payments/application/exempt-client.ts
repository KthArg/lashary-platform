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

// DOM-006: repo.save() lanza ClientAlreadyExempt ante la violación de unicidad parcial (un
// cliente, una exoneración vigente) — el único error de infra que en realidad es un caso de
// negocio esperable. Se atrapa acá y se convierte a Result; cualquier otro throw es infra real.
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

    // Guardar antes de auditar: si repo.save() falla, no hay nada que registrar. Si el registro
    // de auditoría falla después de guardar, el error se propaga (no se traga) — quien llama
    // sabe que la exoneración quedó guardada pero sin bitácora, y puede alertar o reintentar;
    // nunca se finge éxito silencioso (DOM-006).
    await deps.recordAuditEvent({
      actorId: input.exemptedBy,
      action: 'payments.deposit_exemption.granted',
      entityType: 'clients_profile',
      entityId: input.clientId,
      payload: { reason: input.reason, exemptionId: built.value.id },
    })

    return ok(built.value.toView())
  }
