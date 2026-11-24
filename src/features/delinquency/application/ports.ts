import type { Result } from '@/shared/result'
import type { ActiveCaseItem } from '../domain/active-case'
import type { ActiveClient } from '../domain/active-client'
import type { HistoryQuery, HistoryRowsPage } from '../domain/case-history'
import type { CaseDecision, CaseState, DelinquencyCase } from '../domain/delinquency-case'
import type {
  CaseAlreadyDecided,
  CaseNotActive,
  CaseNotFound,
  DelinquencyStorageFailed,
  InvalidForgiveAmount,
  InvalidGraceDays,
  InvalidReason,
  NotAClient,
  RegularizationRefused,
  ReviewRefused,
} from '../domain/errors'
import type { AccountCaseState, AccountEntry, PendingRegularization, RegularizationInput } from '../domain/regularization'

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

export interface CaseHistoryRepository {
  list(query: HistoryQuery): Promise<Result<HistoryRowsPage, DelinquencyStorageFailed>>
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

export interface ReceiptFile {
  readonly bytes: Uint8Array
  readonly contentType: string
}

export interface ReceiptStorage {
  upload(path: string, file: ReceiptFile): Promise<Result<void, DelinquencyStorageFailed>>
}

export interface CurrentClientPort {
  currentClientId(): Promise<Result<string | null, DelinquencyStorageFailed>>
}

export type SubmitRegularizationFailure = RegularizationRefused | NotAClient | DelinquencyStorageFailed

export interface RegularizationRepository {
  submit(input: RegularizationInput & { readonly receiptPath: string }): Promise<Result<string, SubmitRegularizationFailure>>
  myAccount(): Promise<Result<AccountEntry[], DelinquencyStorageFailed>>
}

export interface RegularizationQueueRepository {
  listPending(limit: number): Promise<Result<PendingRegularization[], DelinquencyStorageFailed>>
}

export interface ReceiptLinks {
  signedUrls(paths: readonly string[]): Promise<Result<Map<string, string>, DelinquencyStorageFailed>>
}

export type ReviewRegularizationFailure = ReviewRefused | DelinquencyStorageFailed

export interface RegularizationReviewRepository {
  approve(requestId: string, approvedAmount: number): Promise<Result<AccountCaseState, ReviewRegularizationFailure>>
  reject(requestId: string, reason: string): Promise<Result<void, ReviewRegularizationFailure>>
}
