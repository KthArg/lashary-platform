import { STUDIO_TIME_ZONE } from '@/shared/studio-time'

const APPOINTMENT_DATE_FORMAT = new Intl.DateTimeFormat('es-CR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: STUDIO_TIME_ZONE,
})

export const formatAppointmentDate = (startsAtMs: number): string => APPOINTMENT_DATE_FORMAT.format(startsAtMs)
