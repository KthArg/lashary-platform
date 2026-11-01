import { MS_PER_MINUTE } from './appointment-window.constants'

export { MS_PER_MINUTE }

export const DEPOSIT_PAYMENT_STATUS = {
  NOT_REQUIRED: 'not_required',
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  COVERED: 'covered',
} as const

export type DepositPaymentStatus = (typeof DEPOSIT_PAYMENT_STATUS)[keyof typeof DEPOSIT_PAYMENT_STATUS]

export const AGENDA_APPOINTMENT_STATUSES = [
  'pending_approval',
  'approved',
  'confirmed',
  'completed',
  'no_show',
  'rejected',
] as const

export type AgendaAppointmentStatus = (typeof AGENDA_APPOINTMENT_STATUSES)[number]

export const DAILY_AGENDA_LIMIT = 100
