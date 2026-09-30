import type { Result } from '@/shared/result'
import type { DepositExemption } from '../domain/deposit-exemption'

export interface DepositExemptionRepository {
  save(exemption: DepositExemption): Promise<void>
}

export type RecordAuditEvent = (input: {
  actorId: string
  action: string
  entityType: string
  entityId: string
  payload?: Record<string, unknown>
}) => Promise<Result<unknown, unknown>>
