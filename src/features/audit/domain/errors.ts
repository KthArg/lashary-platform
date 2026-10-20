export const AUDIT_ERROR_CODES = {
  invalidEvent: 'AUDIT_EVENT_INVALID',
} as const

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
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === AUDIT_ERROR_CODES.invalidEvent
