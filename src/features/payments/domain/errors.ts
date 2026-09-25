import { DomainError } from '@/shared/domain-error'

// Errores de dominio de la feature payments (DOM-006). El mapeo a HTTP status ocurre en el
// borde (server actions), en un solo lugar.

export abstract class PaymentsError extends DomainError {}

export class DepositExemptionValidationError extends PaymentsError {
  readonly code = 'PAYMENTS_DEPOSIT_EXEMPTION_INVALID'

  constructor(public readonly problems: string[]) {
    super(`exoneración inválida: ${problems.join('; ')}`)
  }
}

// DOM-006: repo.save() lanza esto ante la violación de la unicidad parcial de la base (un
// cliente no puede tener dos exoneraciones vigentes a la vez) — un caso de negocio esperable,
// no una falla de infraestructura.
export class ClientAlreadyExempt extends PaymentsError {
  readonly code = 'PAYMENTS_CLIENT_ALREADY_EXEMPT'

  constructor(public readonly clientId: string) {
    super(`el cliente ${clientId} ya tiene una exoneración de anticipo vigente`)
  }
}
