export const REQUEST_STATES = ['pending_approval', 'approved', 'rejected', 'replaced'] as const
export type RequestState = (typeof REQUEST_STATES)[number]

export const ACCOUNT_CASE_STATES = ['active', 'settled'] as const
export type AccountCaseState = (typeof ACCOUNT_CASE_STATES)[number]

export const REFERENCE_MAX_LENGTH = 100

export interface RegularizationRequest {
  readonly id: string
  readonly state: RequestState
  readonly declaredAmount: number
  readonly approvedAmount: number | null
  readonly rejectionReason: string | null
  readonly reviewedAt: Date | null
}

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

export function checkRegularizationInput(input: RegularizationInput): RegularizationRefusal | null {
  if (!Number.isSafeInteger(input.declaredAmount) || input.declaredAmount <= 0) return 'declared-amount-invalid'
  const reference = normalizeReference(input.reference)
  if (reference !== null && reference.length > REFERENCE_MAX_LENGTH) return 'reference-too-long'
  return null
}

export const totalOwed = (entries: readonly AccountEntry[]): number =>
  entries.reduce((sum, entry) => (entry.caseState === 'active' ? sum + entry.pending : sum), 0)

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

export interface QueueItem extends PendingRegularization {
  readonly clientName: string | null
  readonly receiptUrl: string | null
}

export const REJECTION_REASON_MIN_LENGTH = 10
export const REJECTION_REASON_MAX_LENGTH = 500

export type ReviewRefusal =
  | 'request-not-found'
  | 'request-not-pending'
  | 'approved-amount-invalid'
  | 'rejection-reason-required'

export const isValidApprovedAmount = (amount: number): boolean => Number.isSafeInteger(amount) && amount > 0

export function normalizeRejectionReason(reason: string): string | null {
  const trimmed = reason.trim()
  return trimmed.length < REJECTION_REASON_MIN_LENGTH || trimmed.length > REJECTION_REASON_MAX_LENGTH ? null : trimmed
}
