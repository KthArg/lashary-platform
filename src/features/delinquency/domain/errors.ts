export const DELINQUENCY_ERROR_CODES = {
  storageFailed: 'DELINQUENCY_STORAGE_FAILED',
  caseNotFound: 'DELINQUENCY_CASE_NOT_FOUND',
  caseAlreadyDecided: 'DELINQUENCY_CASE_ALREADY_DECIDED',
  invalidGraceDays: 'DELINQUENCY_INVALID_GRACE_DAYS',
} as const

type DelinquencyErrorCode = (typeof DELINQUENCY_ERROR_CODES)[keyof typeof DELINQUENCY_ERROR_CODES]

function hasCode<T extends { code: DelinquencyErrorCode }>(error: unknown, code: T['code']): error is T {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === code
}

export interface DelinquencyStorageFailed {
  readonly code: typeof DELINQUENCY_ERROR_CODES.storageFailed
  readonly message: string
}

export function delinquencyStorageFailed(message: string): DelinquencyStorageFailed {
  return { code: DELINQUENCY_ERROR_CODES.storageFailed, message }
}

export const isDelinquencyStorageFailed = (error: unknown): error is DelinquencyStorageFailed =>
  hasCode<DelinquencyStorageFailed>(error, DELINQUENCY_ERROR_CODES.storageFailed)

export interface CaseNotFound {
  readonly code: typeof DELINQUENCY_ERROR_CODES.caseNotFound
  readonly message: string
  readonly caseId: string
}

export function caseNotFound(caseId: string): CaseNotFound {
  return { code: DELINQUENCY_ERROR_CODES.caseNotFound, message: `morosidad inexistente: ${caseId}`, caseId }
}

export const isCaseNotFound = (error: unknown): error is CaseNotFound =>
  hasCode<CaseNotFound>(error, DELINQUENCY_ERROR_CODES.caseNotFound)

export interface CaseAlreadyDecided {
  readonly code: typeof DELINQUENCY_ERROR_CODES.caseAlreadyDecided
  readonly message: string
  readonly caseId: string
}

export function caseAlreadyDecided(caseId: string): CaseAlreadyDecided {
  return {
    code: DELINQUENCY_ERROR_CODES.caseAlreadyDecided,
    message: `la morosidad ya se decidió: ${caseId}`,
    caseId,
  }
}

export const isCaseAlreadyDecided = (error: unknown): error is CaseAlreadyDecided =>
  hasCode<CaseAlreadyDecided>(error, DELINQUENCY_ERROR_CODES.caseAlreadyDecided)

export interface InvalidGraceDays {
  readonly code: typeof DELINQUENCY_ERROR_CODES.invalidGraceDays
  readonly message: string
}

export function invalidGraceDays(): InvalidGraceDays {
  return { code: DELINQUENCY_ERROR_CODES.invalidGraceDays, message: 'el periodo de gracia debe ser un entero de 1 a 90 días' }
}

export const isInvalidGraceDays = (error: unknown): error is InvalidGraceDays =>
  hasCode<InvalidGraceDays>(error, DELINQUENCY_ERROR_CODES.invalidGraceDays)
