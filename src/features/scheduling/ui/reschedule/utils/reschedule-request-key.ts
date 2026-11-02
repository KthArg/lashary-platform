import { RESCHEDULE_DATE_PARAM } from '../constants/reschedule-page-strings'
import type { RescheduleSearchParams } from '../types/reschedule-page.types'

export function rescheduleRequestKey(appointmentId: string, searchParams: RescheduleSearchParams): string {
  const date = searchParams[RESCHEDULE_DATE_PARAM]
  return `${appointmentId}|${(Array.isArray(date) ? date[0] : date) ?? ''}`
}
