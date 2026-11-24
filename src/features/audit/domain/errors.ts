export const AUDIT_ERROR_CODES = {
  invalidEvent: 'AUDIT_EVENT_INVALID',
  invalidQuery: 'AUDIT_QUERY_INVALID',
  storageFailed: 'AUDIT_STORAGE_FAILED',
} as const

const hasAuditErrorCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: unknown }).code === code

export interface AuditEventValidationError {
  readonly code: typeof AUDIT_ERROR_CODES.invalidEvent
  readonly message: string
  readonly problems: string[]
}

export function auditEventValidationError(problems: string[]): AuditEventValidationError {
  return {
    code: AUDIT_ERROR_CODES.invalidEvent,
    message: `evento de auditoría inválido: ${problems.join('; ')}`,
    problems,
  }
}

export const isAuditEventValidationError = (error: unknown): error is AuditEventValidationError =>
  hasAuditErrorCode(error, AUDIT_ERROR_CODES.invalidEvent)

export interface AuditQueryInvalid {
  readonly code: typeof AUDIT_ERROR_CODES.invalidQuery
  readonly message: string
}

export const auditQueryInvalid = (problem: string): AuditQueryInvalid => ({
  code: AUDIT_ERROR_CODES.invalidQuery,
  message: `consulta de auditoría inválida: ${problem}`,
})

export const isAuditQueryInvalid = (error: unknown): error is AuditQueryInvalid =>
  hasAuditErrorCode(error, AUDIT_ERROR_CODES.invalidQuery)

export interface AuditStorageFailed {
  readonly code: typeof AUDIT_ERROR_CODES.storageFailed
  readonly message: string
}

export const auditStorageFailed = (detail: string): AuditStorageFailed => ({
  code: AUDIT_ERROR_CODES.storageFailed,
  message: `no se pudo leer la bitácora: ${detail}`,
})

export const isAuditStorageFailed = (error: unknown): error is AuditStorageFailed =>
  hasAuditErrorCode(error, AUDIT_ERROR_CODES.storageFailed)
