export const CASE_STATES = ['pending_review', 'active', 'dismissed', 'lifted', 'forgiven'] as const

export type CaseState = (typeof CASE_STATES)[number]

export type CaseDecision = 'confirm' | 'dismiss'

export const CASE_DECISIONS: readonly CaseDecision[] = ['confirm', 'dismiss']

// Motivo de una excepción (levantar o condonar), igual de acotado que otros campos de motivo del
// repositorio (manual blocks, exoneraciones de anticipo).
export const EXCEPTION_REASON_MAX_LENGTH = 500

// Tope del historial de excepciones (criterio 4 de US-MOR-05): cada lista (lifted, forgiven) pagina
// con el mismo tope que las demás listas de la pantalla (PERF-002).
export const EXCEPTION_HISTORY_LIST_LIMIT = 50

export interface DelinquencyCase {
  readonly id: string
  readonly clientId: string
  readonly appointmentId: string
  readonly pending: number
  readonly state: CaseState
  readonly detectedAt: Date
  readonly decidedAt: Date | null
  // Solo presentes en `lifted` (reason) y `forgiven` (reason y amount); nunca cambian `pending`, el
  // saldo original con el que se detectó la morosidad (criterio 4 de US-MOR-05).
  readonly exceptionReason: string | null
  readonly exceptionAmount: number | null
}

export const stateAfterDecision = (decision: CaseDecision): CaseState =>
  decision === 'confirm' ? 'active' : 'dismissed'
