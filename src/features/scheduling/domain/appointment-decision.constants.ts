export const APPOINTMENT_DECISION = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export type AppointmentDecision = (typeof APPOINTMENT_DECISION)[keyof typeof APPOINTMENT_DECISION]

export const MAX_DECISION_REASON_LENGTH = 500
