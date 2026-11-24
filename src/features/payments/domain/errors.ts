export const PAYMENTS_ERROR_CODES = {
  invalidExemption: 'PAYMENTS_DEPOSIT_EXEMPTION_INVALID',
  clientAlreadyExempt: 'PAYMENTS_CLIENT_ALREADY_EXEMPT',
  invalidLedgerRange: 'PAYMENTS_LEDGER_RANGE_INVALID',
  ledgerExportTooLarge: 'PAYMENTS_LEDGER_EXPORT_TOO_LARGE',
  storageFailed: 'PAYMENTS_STORAGE_FAILED',
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

export interface InvalidLedgerRange {
  readonly code: typeof PAYMENTS_ERROR_CODES.invalidLedgerRange
  readonly message: string
}

export const invalidLedgerRange = (message: string): InvalidLedgerRange => ({
  code: PAYMENTS_ERROR_CODES.invalidLedgerRange,
  message,
})

export const isInvalidLedgerRange = (error: unknown): error is InvalidLedgerRange =>
  hasCode<InvalidLedgerRange>(error, PAYMENTS_ERROR_CODES.invalidLedgerRange)

export interface LedgerExportTooLarge {
  readonly code: typeof PAYMENTS_ERROR_CODES.ledgerExportTooLarge
  readonly message: string
}

export const ledgerExportTooLarge = (maxEntries: number): LedgerExportTooLarge => ({
  code: PAYMENTS_ERROR_CODES.ledgerExportTooLarge,
  message: `demasiados asientos (más de ${maxEntries}), acote el rango`,
})

export const isLedgerExportTooLarge = (error: unknown): error is LedgerExportTooLarge =>
  hasCode<LedgerExportTooLarge>(error, PAYMENTS_ERROR_CODES.ledgerExportTooLarge)

export interface PaymentsStorageFailed {
  readonly code: typeof PAYMENTS_ERROR_CODES.storageFailed
  readonly message: string
}

export const paymentsStorageFailed = (message: string): PaymentsStorageFailed => ({
  code: PAYMENTS_ERROR_CODES.storageFailed,
  message,
})
