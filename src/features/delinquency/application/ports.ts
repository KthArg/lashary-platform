import type { Result } from '@/shared/result'
import type { ActiveCaseItem } from '../domain/active-case'
import type { ActiveClient } from '../domain/active-client'
import type { CaseDecision, CaseState, DelinquencyCase } from '../domain/delinquency-case'
import type {
  CaseAlreadyDecided,
  CaseNotActive,
  CaseNotFound,
  DelinquencyStorageFailed,
  InvalidForgiveAmount,
  InvalidGraceDays,
  InvalidReason,
} from '../domain/errors'

export type DecideCaseFailure = DelinquencyStorageFailed | CaseNotFound | CaseAlreadyDecided
export type LiftCaseFailure = DelinquencyStorageFailed | CaseNotFound | CaseNotActive | InvalidReason
export type ForgiveCaseFailure =
  | DelinquencyStorageFailed
  | CaseNotFound
  | CaseNotActive
  | InvalidReason
  | InvalidForgiveAmount

export interface CaseRepository {
  decide(caseId: string, decision: CaseDecision): Promise<Result<DelinquencyCase, DecideCaseFailure>>
  lift(caseId: string, reason: string): Promise<Result<DelinquencyCase, LiftCaseFailure>>
  forgive(caseId: string, amount: number, reason: string): Promise<Result<DelinquencyCase, ForgiveCaseFailure>>
}

export interface CaseListRepository {
  listByState(state: CaseState, limit: number): Promise<Result<DelinquencyCase[], DelinquencyStorageFailed>>
  listActiveClients(limit: number): Promise<Result<ActiveClient[], DelinquencyStorageFailed>>
  listActiveCases(limit: number): Promise<Result<ActiveCaseItem[], DelinquencyStorageFailed>>
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
