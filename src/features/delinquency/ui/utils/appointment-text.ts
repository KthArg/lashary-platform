import { formatStudioDateTime } from '@/shared/studio-time'
import type { HistoryAppointment } from '@/features/delinquency/domain/case-history'

export const appointmentText = (appointment: HistoryAppointment | null, missingText: string): string => {
  if (appointment === null) return missingText
  const date = formatStudioDateTime(new Date(appointment.startsAtMs))
  return appointment.serviceName === null ? date : `${date} · ${appointment.serviceName}`
}
