import { ok, err, type Result } from '@/shared/result'
import { isCalendarDate } from '@/shared/studio-time'

export interface AppointmentRange { from: string | null; to: string | null }

export type AppointmentRangeError = 'inverted-appointment-range'

export function readAppointmentDate(value: unknown): string | null {
  return typeof value === 'string' && isCalendarDate(value) ? value : null
}

export function readAppointmentRange(from: unknown, to: unknown): Result<AppointmentRange, AppointmentRangeError> {
  const range = { from: readAppointmentDate(from), to: readAppointmentDate(to) }
  if (range.from && range.to && range.from > range.to) return err('inverted-appointment-range')
  return ok(range)
}
