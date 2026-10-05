import { DomainError } from '@/shared/domain-error'

export abstract class AuditError extends DomainError {}

export class AuditEventValidationError extends AuditError {
  readonly code = 'AUDIT_EVENT_INVALID'

  constructor(public readonly problems: string[]) {
    super(`evento de auditoría inválido: ${problems.join('; ')}`)
  }
}
