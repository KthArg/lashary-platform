import type { Result } from '@/shared/result'
import type { CancellationError, CancellationQuote, CancelledAppointment } from '../../../application/ports'
import { cancellationMessages } from '../constants/cancellation-strings'
import { appointmentIdSchema } from '../validation/appointment-id-schema'
import { getCancellationErrorMessage } from './cancellation-error-message'
import { toCancellationQuoteView } from './cancellation-format'
import type { CancelAppointmentResult, QuoteCancellationResult } from '../types/cancellation-results'

export type CancellationDeps = {
  isClient: () => Promise<boolean>
  quote: (appointmentId: string) => Promise<Result<CancellationQuote, CancellationError>>
  cancel: (appointmentId: string) => Promise<Result<CancelledAppointment, CancellationError>>
}

export async function performQuoteCancellation(
  rawAppointmentId: unknown,
  deps: CancellationDeps,
): Promise<QuoteCancellationResult> {
  if (!(await deps.isClient())) return { ok: false, message: cancellationMessages.accessDenied }

  const parsed = appointmentIdSchema.safeParse(rawAppointmentId)
  if (!parsed.success) return { ok: false, message: cancellationMessages.invalidAppointment }

  const quote = await deps.quote(parsed.data)
  if (!quote.ok) return { ok: false, message: getCancellationErrorMessage(quote.error) }
  return { ok: true, quote: toCancellationQuoteView(parsed.data, quote.value) }
}

export async function performCancelAppointment(
  rawAppointmentId: unknown,
  deps: CancellationDeps,
): Promise<CancelAppointmentResult> {
  if (!(await deps.isClient())) return { ok: false, message: cancellationMessages.accessDenied }

  const parsed = appointmentIdSchema.safeParse(rawAppointmentId)
  if (!parsed.success) return { ok: false, message: cancellationMessages.invalidAppointment }

  const cancelled = await deps.cancel(parsed.data)
  if (!cancelled.ok) return { ok: false, message: getCancellationErrorMessage(cancelled.error) }

  return {
    ok: true,
    message:
      cancelled.value.forfeitedDeposit > 0
        ? cancellationMessages.cancelledLosingDeposit
        : cancellationMessages.cancelled,
  }
}
