import type { Result } from '@/shared/result'
import type { ActiveClient } from '../domain/active-client'
import type { CaseDecision, CaseState, DelinquencyCase } from '../domain/delinquency-case'
import type { CaseAlreadyDecided, CaseNotFound, DelinquencyStorageFailed } from '../domain/errors'

export type DecideCaseFailure = DelinquencyStorageFailed | CaseNotFound | CaseAlreadyDecided

export interface CaseRepository {
  decide(caseId: string, decision: CaseDecision): Promise<Result<DelinquencyCase, DecideCaseFailure>>
}

export interface CaseListRepository {
  listByState(state: CaseState, limit: number): Promise<Result<DelinquencyCase[], DelinquencyStorageFailed>>
  listActiveClients(limit: number): Promise<Result<ActiveClient[], DelinquencyStorageFailed>>
}

export interface ClientNamesPort {
  namesFor(clientIds: string[]): Promise<Result<Map<string, string>, DelinquencyStorageFailed>>
}
