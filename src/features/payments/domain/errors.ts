import { DomainError } from '@/shared/domain-error'

export abstract class PaymentsError extends DomainError {}

export class DepositExemptionValidationError extends PaymentsError {
  readonly code = 'PAYMENTS_DEPOSIT_EXEMPTION_INVALID'

  constructor(public readonly problems: string[]) {
    super(`exoneración inválida: ${problems.join('; ')}`)
  }
}

export class ClientAlreadyExempt extends PaymentsError {
  readonly code = 'PAYMENTS_CLIENT_ALREADY_EXEMPT'

  constructor(public readonly clientId: string) {
    super(`el cliente ${clientId} ya tiene una exoneración de anticipo vigente`)
  }
}
