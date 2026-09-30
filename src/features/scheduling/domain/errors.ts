export interface InvalidTimeRangeError {
  readonly code: 'SCHEDULING_INVALID_TIME_RANGE'
  readonly message: string
  readonly startTime: string
  readonly endTime: string
}

export function invalidTimeRangeError(startTime: string, endTime: string): InvalidTimeRangeError {
  return {
    code: 'SCHEDULING_INVALID_TIME_RANGE',
    message: `El horario de fin (${endTime}) debe ser posterior al de inicio (${startTime}).`,
    startTime,
    endTime,
  }
}

export function isInvalidTimeRangeError(error: unknown): error is InvalidTimeRangeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'SCHEDULING_INVALID_TIME_RANGE'
  )
}

export interface InvalidDayOfWeekError {
  readonly code: 'SCHEDULING_INVALID_DAY_OF_WEEK'
  readonly message: string
  readonly value: number
}

export function invalidDayOfWeekError(value: number): InvalidDayOfWeekError {
  return {
    code: 'SCHEDULING_INVALID_DAY_OF_WEEK',
    message: `Día de la semana inválido: ${value}. Debe estar entre 0 (domingo) y 6 (sábado).`,
    value,
  }
}

export function isInvalidDayOfWeekError(error: unknown): error is InvalidDayOfWeekError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'SCHEDULING_INVALID_DAY_OF_WEEK'
  )
}

export interface InvalidDateError {
  readonly code: 'SCHEDULING_INVALID_DATE'
  readonly message: string
  readonly value: string
}

export function invalidDateError(value: string): InvalidDateError {
  return {
    code: 'SCHEDULING_INVALID_DATE',
    message: `Fecha inválida: ${value}. Formato esperado YYYY-MM-DD.`,
    value,
  }
}

export function isInvalidDateError(error: unknown): error is InvalidDateError {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'SCHEDULING_INVALID_DATE'
  )
}

export interface ClosedDateAlreadyExistsError {
  readonly code: 'SCHEDULING_CLOSED_DATE_EXISTS'
  readonly message: string
  readonly closedDate: string
}

export function closedDateAlreadyExistsError(closedDate: string): ClosedDateAlreadyExistsError {
  return {
    code: 'SCHEDULING_CLOSED_DATE_EXISTS',
    message: `Ya existe un día no laborable registrado para el ${closedDate}.`,
    closedDate,
  }
}

export function isClosedDateAlreadyExistsError(error: unknown): error is ClosedDateAlreadyExistsError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'SCHEDULING_CLOSED_DATE_EXISTS'
  )
}

export interface InvalidBlockRangeError {
  readonly code: 'SCHEDULING_INVALID_BLOCK_RANGE'
  readonly message: string
}

export function invalidBlockRangeError(): InvalidBlockRangeError {
  return {
    code: 'SCHEDULING_INVALID_BLOCK_RANGE',
    message: 'El bloqueo debe terminar después de empezar.',
  }
}

export function isInvalidBlockRangeError(error: unknown): error is InvalidBlockRangeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'SCHEDULING_INVALID_BLOCK_RANGE'
  )
}
