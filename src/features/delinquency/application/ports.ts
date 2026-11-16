import type { Result } from '@/shared/result'
import type { ActiveClient } from '../domain/active-client'
import type { CaseDecision, CaseState, DelinquencyCase } from '../domain/delinquency-case'
import type { CaseAlreadyDecided, CaseNotFound, DelinquencyStorageFailed, InvalidGraceDays } from '../domain/errors'

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

export interface DetectionRepository {
  // Cuántas morosidades por revisar generó la corrida; 0 si no había nada nuevo.
  detectUnpaid(): Promise<Result<number, DelinquencyStorageFailed>>
}

export type ChangeGraceDaysFailure = DelinquencyStorageFailed | InvalidGraceDays

export interface SettingsRepository {
  graceDays(): Promise<Result<number, DelinquencyStorageFailed>>
  setGraceDays(days: number): Promise<Result<number, ChangeGraceDaysFailure>>
}
