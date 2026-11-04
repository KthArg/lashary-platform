export const CLOSABLE_STATUSES = ['approved', 'confirmed'] as const

export type ClosableStatus = (typeof CLOSABLE_STATUSES)[number]

export const CLOSE_OUTCOMES = ['completed', 'no_show'] as const

export type CloseOutcome = (typeof CLOSE_OUTCOMES)[number]

export const NO_AMOUNT = 0

export const UNCLOSED_APPOINTMENTS_LIMIT = 50
