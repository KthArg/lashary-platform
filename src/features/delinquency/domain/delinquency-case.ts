export const CASE_STATES = ['pending_review', 'active', 'dismissed', 'lifted', 'forgiven'] as const

export type CaseState = (typeof CASE_STATES)[number]

export type CaseDecision = 'confirm' | 'dismiss'

export const CASE_DECISIONS: readonly CaseDecision[] = ['confirm', 'dismiss']

export const EXCEPTION_REASON_MAX_LENGTH = 500

export const EXCEPTION_HISTORY_LIST_LIMIT = 50

export const FORGIVE_AMOUNT_MIN = 1

export interface DelinquencyCase {
  readonly id: string
  readonly clientId: string
  readonly appointmentId: string
  readonly pending: number
  readonly state: CaseState
  readonly detectedAt: Date
  readonly decidedAt: Date | null
  readonly exceptionReason: string | null
  readonly exceptionAmount: number | null
}

export const stateAfterDecision = (decision: CaseDecision): CaseState =>
  decision === 'confirm' ? 'active' : 'dismissed'
