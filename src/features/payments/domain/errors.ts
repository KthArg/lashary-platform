export const PAYMENTS_ERROR_CODES = {
  invalidExemption: 'PAYMENTS_DEPOSIT_EXEMPTION_INVALID',
  clientAlreadyExempt: 'PAYMENTS_CLIENT_ALREADY_EXEMPT',
} as const

type PaymentsErrorCode = (typeof PAYMENTS_ERROR_CODES)[keyof typeof PAYMENTS_ERROR_CODES]

function hasCode<T extends { code: PaymentsErrorCode }>(
  error: unknown,
  code: T['code'],
): error is T {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === code
}

export interface DepositExemptionValidationError {
  readonly code: typeof PAYMENTS_ERROR_CODES.invalidExemption
  readonly message: string
  readonly problems: string[]
}

export function depositExemptionValidationError(problems: string[]): DepositExemptionValidationError {
  return {
    code: PAYMENTS_ERROR_CODES.invalidExemption,
    message: `exoneración inválida: ${problems.join('; ')}`,
    problems,
  }
}

export const isDepositExemptionValidationError = (
  error: unknown,
): error is DepositExemptionValidationError =>
  hasCode<DepositExemptionValidationError>(error, PAYMENTS_ERROR_CODES.invalidExemption)

export interface ClientAlreadyExempt {
  readonly code: typeof PAYMENTS_ERROR_CODES.clientAlreadyExempt
  readonly message: string
  readonly clientId: string
}

export function clientAlreadyExempt(clientId: string): ClientAlreadyExempt {
  return {
    code: PAYMENTS_ERROR_CODES.clientAlreadyExempt,
    message: `el cliente ${clientId} ya tiene una exoneración de anticipo vigente`,
    clientId,
  }
}

export const isClientAlreadyExempt = (error: unknown): error is ClientAlreadyExempt =>
  hasCode<ClientAlreadyExempt>(error, PAYMENTS_ERROR_CODES.clientAlreadyExempt)
