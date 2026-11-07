import type { Result } from '@/shared/result'
import type { ConfirmationError, ConfirmedAppointment } from '@/features/scheduling/application/ports'
import { cancellationMessages } from '../constants/cancellation-strings'
import { confirmationMessages } from '../constants/confirmation-strings'
import { appointmentIdSchema } from '../validation/appointment-id-schema'
import type { ConfirmAppointmentResult } from '../types/confirmation-results'

export type ConfirmationDeps = {
  isClient: () => Promise<boolean>
  confirm: (appointmentId: string) => Promise<Result<ConfirmedAppointment, ConfirmationError>>
}

const errorMessagesByCode: Record<ConfirmationError['code'], string> = {
  SCHEDULING_APPOINTMENT_NOT_CONFIRMABLE: confirmationMessages.notConfirmable,
  SCHEDULING_STORAGE_FAILED: confirmationMessages.failed,
}

function toConfirmedMessage({ windowHours, depositRequired }: ConfirmedAppointment): string {
  if (windowHours === 0 || depositRequired === 0) return confirmationMessages.confirmed
  return confirmationMessages.confirmedWithPolicy(cancellationMessages.hours(windowHours))
}

export async function performConfirmAppointment(
  rawAppointmentId: unknown,
  deps: ConfirmationDeps,
): Promise<ConfirmAppointmentResult> {
  if (!(await deps.isClient())) return { ok: false, message: confirmationMessages.accessDenied }

  const parsed = appointmentIdSchema.safeParse(rawAppointmentId)
  if (!parsed.success) return { ok: false, message: confirmationMessages.invalidAppointment }

  const confirmed = await deps.confirm(parsed.data)
  if (!confirmed.ok) return { ok: false, message: errorMessagesByCode[confirmed.error.code] }
  return { ok: true, message: toConfirmedMessage(confirmed.value) }
}
