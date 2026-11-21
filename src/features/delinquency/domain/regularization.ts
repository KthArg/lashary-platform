// Regularización de una morosidad (US-MOR-03): la clienta envía un comprobante y la administradora lo revisa.
// Contrato: docs/contracts/delinquency-api.md, «Regularización».

export const REQUEST_STATES = ['pending_approval', 'approved', 'rejected', 'replaced'] as const
export type RequestState = (typeof REQUEST_STATES)[number]

export const ACCOUNT_CASE_STATES = ['active', 'settled'] as const
export type AccountCaseState = (typeof ACCOUNT_CASE_STATES)[number]

// La referencia del pago es opcional; la base repite el tope.
export const REFERENCE_MAX_LENGTH = 100

export interface RegularizationRequest {
  readonly id: string
  readonly state: RequestState
  readonly declaredAmount: number
  readonly approvedAmount: number | null
  readonly rejectionReason: string | null
  readonly reviewedAt: Date | null
}

// Una morosidad en el estado de cuenta de la clienta: lo que debe hoy y su solicitud más reciente.
export interface AccountEntry {
  readonly caseId: string
  readonly caseState: AccountCaseState
  readonly appointmentId: string
  readonly pending: number
  readonly since: Date
  readonly request: RegularizationRequest | null
}

export interface RegularizationInput {
  readonly caseId: string
  readonly declaredAmount: number
  readonly reference: string | null
}

export type RegularizationRefusal =
  | 'case-not-regularizable'
  | 'case-already-paid'
  | 'declared-amount-invalid'
  | 'reference-too-long'
  | 'receipt-not-found'
  | 'receipt-already-used'

export const normalizeReference = (reference: string | null): string | null => {
  const trimmed = reference?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

// Lo que se puede saber sin la base: un monto entero positivo y una referencia dentro del tope. Si lo declarado
// supera lo que debe la cita lo dice la base, que conoce el saldo de hoy.
export function checkRegularizationInput(input: RegularizationInput): RegularizationRefusal | null {
  if (!Number.isSafeInteger(input.declaredAmount) || input.declaredAmount <= 0) return 'declared-amount-invalid'
  const reference = normalizeReference(input.reference)
  if (reference !== null && reference.length > REFERENCE_MAX_LENGTH) return 'reference-too-long'
  return null
}

// El total del estado de cuenta: lo que debe en morosidades confirmadas, no el saldo completo del ledger (contrato).
export const totalOwed = (entries: readonly AccountEntry[]): number =>
  entries.reduce((sum, entry) => (entry.caseState === 'active' ? sum + entry.pending : sum), 0)

// Una solicitud que espera la revisión de la administradora (cola de comprobantes).
export interface PendingRegularization {
  readonly requestId: string
  readonly caseId: string
  readonly clientId: string
  readonly declaredAmount: number
  readonly reference: string | null
  readonly receiptPath: string
  readonly pendingToday: number
  readonly submittedAt: Date
}

// Lo que ve la administradora: la solicitud con el nombre de la clienta y el enlace firmado al comprobante
// (null si no se pudo firmar: la fila se muestra igual, sin enlace).
export interface QueueItem extends PendingRegularization {
  readonly clientName: string | null
  readonly receiptUrl: string | null
}

// La base repite los dos límites del motivo del rechazo. El mínimo lo decidió la clienta (dueña del estudio) el
// 2026-11-18: la clienta lee el motivo, así que tiene que decirle algo.
export const REJECTION_REASON_MIN_LENGTH = 10
export const REJECTION_REASON_MAX_LENGTH = 500

export type ReviewRefusal =
  | 'request-not-found'
  | 'request-not-pending'
  | 'approved-amount-invalid'
  | 'rejection-reason-required'

// Lo aprobado puede ser distinto de lo declarado (Kenny, 2026-11-13); que no pase lo que debe hoy lo dice la base.
export const isValidApprovedAmount = (amount: number): boolean => Number.isSafeInteger(amount) && amount > 0

export function normalizeRejectionReason(reason: string): string | null {
  const trimmed = reason.trim()
  return trimmed.length < REJECTION_REASON_MIN_LENGTH || trimmed.length > REJECTION_REASON_MAX_LENGTH ? null : trimmed
}
