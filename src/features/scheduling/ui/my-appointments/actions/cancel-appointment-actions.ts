'use server'

import { revalidatePath } from 'next/cache'
import { MY_APPOINTMENTS_PATH } from '../constants/my-appointments-strings'
import { cancellationService } from '../services/cancellation-service'
import type { CancelAppointmentResult, QuoteCancellationResult } from '../types/cancellation-results'

export async function quoteCancellationAction(appointmentId: string): Promise<QuoteCancellationResult> {
  return cancellationService.quote(appointmentId)
}

export async function cancelAppointmentAction(appointmentId: string): Promise<CancelAppointmentResult> {
  const result = await cancellationService.cancel(appointmentId)
  if (result.ok) revalidatePath(MY_APPOINTMENTS_PATH)
  return result
}
