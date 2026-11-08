export const CASE_STATES = ['pending_review', 'active', 'dismissed'] as const

export type CaseState = (typeof CASE_STATES)[number]

export type CaseDecision = 'confirm' | 'dismiss'

export const CASE_DECISIONS: readonly CaseDecision[] = ['confirm', 'dismiss']

export interface DelinquencyCase {
  readonly id: string
  readonly clientId: string
  readonly appointmentId: string
  readonly pending: number
  readonly state: CaseState
  readonly detectedAt: Date
  readonly decidedAt: Date | null
}

export const stateAfterDecision = (decision: CaseDecision): CaseState =>
  decision === 'confirm' ? 'active' : 'dismissed'
