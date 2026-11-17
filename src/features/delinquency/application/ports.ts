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

export interface ReceiptFile {
  readonly bytes: Uint8Array
  readonly contentType: string
}

export interface ReceiptStorage {
  // Sube sin reemplazar: un comprobante ya subido no se cambia (el bucket no tiene UPDATE ni DELETE).
  upload(path: string, file: ReceiptFile): Promise<Result<void, DelinquencyStorageFailed>>
}

export interface CurrentClientPort {
  // El perfil de clienta de la sesión, o null si la sesión no es de una clienta.
  currentClientId(): Promise<Result<string | null, DelinquencyStorageFailed>>
}
