'use server'

import { rescheduleService } from '../services/reschedule-service'
import type { RescheduleAppointmentResult } from '../types/reschedule-results'

export async function rescheduleAppointmentAction(rawRequest: unknown): Promise<RescheduleAppointmentResult> {
  return rescheduleService.reschedule(rawRequest)
}
