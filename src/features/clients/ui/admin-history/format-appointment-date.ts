import { studioDateFormat } from '../shared/studio-date-format'

const APPOINTMENT_DATE_FORMAT = studioDateFormat({ dateStyle: 'medium', timeStyle: 'short' })

export const formatAppointmentDate = (startsAtMs: number): string => APPOINTMENT_DATE_FORMAT.format(startsAtMs)
