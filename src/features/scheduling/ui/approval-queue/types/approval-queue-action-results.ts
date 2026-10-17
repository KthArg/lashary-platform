import type { PendingAppointment } from '../../../application/ports'

export type ListPendingAppointmentsResult =
  | { ok: true; appointments: readonly PendingAppointment[] }
  | { ok: false; error: string }

export type DecideAppointmentResult = { ok: true } | { ok: false; error: string }
