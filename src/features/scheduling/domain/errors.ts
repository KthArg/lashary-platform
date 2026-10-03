export const SCHEDULING_ERROR_CODES = {
  invalidTimeRange: 'SCHEDULING_INVALID_TIME_RANGE',
  invalidDayOfWeek: 'SCHEDULING_INVALID_DAY_OF_WEEK',
  invalidDate: 'SCHEDULING_INVALID_DATE',
  closedDateExists: 'SCHEDULING_CLOSED_DATE_EXISTS',
  invalidBlockRange: 'SCHEDULING_INVALID_BLOCK_RANGE',
} as const

type SchedulingErrorCode = (typeof SCHEDULING_ERROR_CODES)[keyof typeof SCHEDULING_ERROR_CODES]

function hasCode<T extends { code: SchedulingErrorCode }>(error: unknown, code: T['code']): error is T {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === code
}

export interface InvalidTimeRangeError {
  readonly code: typeof SCHEDULING_ERROR_CODES.invalidTimeRange
  readonly startTime: string
  readonly endTime: string
}

export function invalidTimeRangeError(startTime: string, endTime: string): InvalidTimeRangeError {
  return { code: SCHEDULING_ERROR_CODES.invalidTimeRange, startTime, endTime }
}

export const isInvalidTimeRangeError = (error: unknown): error is InvalidTimeRangeError =>
  hasCode<InvalidTimeRangeError>(error, SCHEDULING_ERROR_CODES.invalidTimeRange)

export interface InvalidDayOfWeekError {
  readonly code: typeof SCHEDULING_ERROR_CODES.invalidDayOfWeek
  readonly value: number
}

export function invalidDayOfWeekError(value: number): InvalidDayOfWeekError {
  return { code: SCHEDULING_ERROR_CODES.invalidDayOfWeek, value }
}

export const isInvalidDayOfWeekError = (error: unknown): error is InvalidDayOfWeekError =>
  hasCode<InvalidDayOfWeekError>(error, SCHEDULING_ERROR_CODES.invalidDayOfWeek)

export interface InvalidDateError {
  readonly code: typeof SCHEDULING_ERROR_CODES.invalidDate
  readonly value: string
}

export function invalidDateError(value: string): InvalidDateError {
  return { code: SCHEDULING_ERROR_CODES.invalidDate, value }
}

export const isInvalidDateError = (error: unknown): error is InvalidDateError =>
  hasCode<InvalidDateError>(error, SCHEDULING_ERROR_CODES.invalidDate)

export interface ClosedDateAlreadyExistsError {
  readonly code: typeof SCHEDULING_ERROR_CODES.closedDateExists
  readonly closedDate: string
}

export function closedDateAlreadyExistsError(closedDate: string): ClosedDateAlreadyExistsError {
  return { code: SCHEDULING_ERROR_CODES.closedDateExists, closedDate }
}

export const isClosedDateAlreadyExistsError = (error: unknown): error is ClosedDateAlreadyExistsError =>
  hasCode<ClosedDateAlreadyExistsError>(error, SCHEDULING_ERROR_CODES.closedDateExists)

export interface InvalidBlockRangeError {
  readonly code: typeof SCHEDULING_ERROR_CODES.invalidBlockRange
}

export function invalidBlockRangeError(): InvalidBlockRangeError {
  return { code: SCHEDULING_ERROR_CODES.invalidBlockRange }
}

export const isInvalidBlockRangeError = (error: unknown): error is InvalidBlockRangeError =>
  hasCode<InvalidBlockRangeError>(error, SCHEDULING_ERROR_CODES.invalidBlockRange)

export type SchedulingError =
  | InvalidTimeRangeError
  | InvalidDayOfWeekError
  | InvalidDateError
  | ClosedDateAlreadyExistsError
  | InvalidBlockRangeError
