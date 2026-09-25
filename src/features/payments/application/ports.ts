import type { DepositExemption } from '../domain/deposit-exemption'

// save() lanza ClientAlreadyExempt (domain/errors.ts) ante la violación de la unicidad parcial
// de la base (un cliente, una exoneración vigente) — mismo patrón que TechniqueNameConflict en
// catalog.
export interface DepositExemptionRepository {
  save(exemption: DepositExemption): Promise<void>
}

// Puerto hacia la bitácora de auditoría. No se importa la feature audit aquí: quien cablea
// index.ts inyecta su record() real (por el entry point, ARCH-003); los tests inyectan uno
// falso, igual que con repo y clock.
export type RecordAuditEvent = (input: {
  actorId: string
  action: string
  entityType: string
  entityId: string
  payload?: Record<string, unknown>
}) => Promise<unknown>
