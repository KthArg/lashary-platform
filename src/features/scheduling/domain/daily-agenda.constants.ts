import { MS_PER_MINUTE } from './appointment-window.constants'

export { MS_PER_MINUTE }

export const DEPOSIT_PAYMENT_STATUS = {
  NOT_REQUIRED: 'not_required',
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  COVERED: 'covered',
} as const

export type DepositPaymentStatus = (typeof DEPOSIT_PAYMENT_STATUS)[keyof typeof DEPOSIT_PAYMENT_STATUS]

// Citas que la agenda del día muestra: las que siguen vivas, las ya atendidas ese día y las rechazadas.
// Quedan fuera las canceladas. Quién aprobó mostrar las rechazadas: SPEC.md, US-AGE-11.
export const AGENDA_APPOINTMENT_STATUSES = [
  'pending_approval',
  'approved',
  'confirmed',
  'completed',
  'no_show',
  'rejected',
] as const

export type AgendaAppointmentStatus = (typeof AGENDA_APPOINTMENT_STATUSES)[number]
