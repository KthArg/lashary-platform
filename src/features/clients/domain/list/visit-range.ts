import { ok, err, type Result } from '@/shared/result'
import { isCalendarDate } from '@/shared/studio-time'

export interface VisitRange { from: string | null; to: string | null }

export type VisitRangeError = 'inverted-visit-range'

export function readVisitDate(value: unknown): string | null {
  return typeof value === 'string' && isCalendarDate(value) ? value : null
}

export function readVisitRange(from: unknown, to: unknown): Result<VisitRange, VisitRangeError> {
  const range = { from: readVisitDate(from), to: readVisitDate(to) }
  if (range.from && range.to && range.from > range.to) return err('inverted-visit-range')
  return ok(range)
}
