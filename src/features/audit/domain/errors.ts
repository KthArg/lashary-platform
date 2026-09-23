import { DomainError } from '@/shared/domain-error'

// Errores de dominio de la feature audit (DOM-006). El mapeo a HTTP status, si alguna vez hace
// falta uno, ocurre en el borde de quien llame a record() — audit no tiene ruta propia.

export abstract class AuditError extends DomainError {}

export class AuditEventValidationError extends AuditError {
  readonly code = 'AUDIT_EVENT_INVALID'

  constructor(public readonly problems: string[]) {
    super(`evento de auditoría inválido: ${problems.join('; ')}`)
  }
}
