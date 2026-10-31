'use server'

import { revalidatePath } from 'next/cache'
import { MY_APPOINTMENTS_PATH } from '../../my-appointments/constants/my-appointments-strings'
import { rescheduleService } from '../services/reschedule-service'
import type { RescheduleAppointmentResult } from '../types/reschedule-results'

export async function rescheduleAppointmentAction(rawRequest: unknown): Promise<RescheduleAppointmentResult> {
  const result = await rescheduleService.reschedule(rawRequest)
  if (result.ok) revalidatePath(MY_APPOINTMENTS_PATH)
  return result
}
