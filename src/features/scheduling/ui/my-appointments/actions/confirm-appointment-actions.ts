'use server'

import { revalidatePath } from 'next/cache'
import { MY_APPOINTMENTS_PATH } from '../constants/my-appointments-strings'
import { confirmationService } from '../services/confirmation-service'
import type { ConfirmAppointmentResult } from '../types/confirmation-results'

export async function confirmAppointmentAction(appointmentId: string): Promise<ConfirmAppointmentResult> {
  const result = await confirmationService.confirm(appointmentId)
  if (result.ok) revalidatePath(MY_APPOINTMENTS_PATH)
  return result
}
