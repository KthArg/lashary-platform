import type { ClosedAppointment } from '@/features/scheduling/application/closing-ports'

export type CloseAppointmentActionResult =
  | { ok: true; closing: ClosedAppointment }
  | { ok: false; error: string }
