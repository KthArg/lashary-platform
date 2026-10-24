import type { Result } from '@/shared/result'
import type {
  RescheduledAppointment,
  RescheduleError,
  RescheduleInput,
} from '../../../application/ports'
import { rescheduleMessages } from '../constants/reschedule-strings'
import { rescheduleRequestSchema } from '../validation/reschedule-request-schema'
import { getRescheduleErrorMessage } from './reschedule-error-message'
import type { RescheduleAppointmentResult } from '../types/reschedule-results'

export type RescheduleDeps = {
  isClient: () => Promise<boolean>
  reschedule: (input: RescheduleInput) => Promise<Result<RescheduledAppointment, RescheduleError>>
}

export async function performRescheduleAppointment(
  rawRequest: unknown,
  deps: RescheduleDeps,
): Promise<RescheduleAppointmentResult> {
  if (!(await deps.isClient())) return { ok: false, message: rescheduleMessages.accessDenied }

  const parsed = rescheduleRequestSchema.safeParse(rawRequest)
  if (!parsed.success) return { ok: false, message: rescheduleMessages.invalidRequest }

  const rescheduled = await deps.reschedule(parsed.data)
  if (!rescheduled.ok) return { ok: false, message: getRescheduleErrorMessage(rescheduled.error) }

  return { ok: true, message: rescheduleMessages.rescheduled }
}
