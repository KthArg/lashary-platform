import { ok, err, type Result } from '@/shared/result'

export interface VisitRange { from: string | null; to: string | null }

export type VisitRangeError = 'inverted-visit-range'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const MONTHS_WITH_30_DAYS = [4, 6, 9, 11]

const isLeapYear = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

const daysInMonth = (year: number, month: number): number => {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return MONTHS_WITH_30_DAYS.includes(month) ? 30 : 31
}

export function readVisitDate(value: unknown): string | null {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const existsInCalendar = month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
  return existsInCalendar ? value : null
}

export function readVisitRange(from: unknown, to: unknown): Result<VisitRange, VisitRangeError> {
  const range = { from: readVisitDate(from), to: readVisitDate(to) }
  if (range.from && range.to && range.from > range.to) return err('inverted-visit-range')
  return ok(range)
}
