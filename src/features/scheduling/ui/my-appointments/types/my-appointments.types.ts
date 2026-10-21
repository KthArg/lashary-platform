import type { MyAppointment } from '../../../application/ports'

export type MyAppointmentsData =
  | { status: 'forbidden' }
  | { status: 'error' }
  | { status: 'ready'; appointments: readonly MyAppointment[] }

export type MyAppointmentView = {
  id: string
  service: string
  kind: string | null
  slot: string
  status: string
  amounts: string | null
}

export type MyAppointmentsView =
  | { status: 'forbidden' }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'ready'; appointments: readonly MyAppointmentView[] }
