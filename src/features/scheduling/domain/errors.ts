import { DomainError } from '@/shared/domain-error'

export abstract class SchedulingError extends DomainError {}

export class InvalidTimeRangeError extends SchedulingError {
  readonly code = 'SCHEDULING_INVALID_TIME_RANGE'

  constructor(startTime: string, endTime: string) {
    super(`El horario de fin (${endTime}) debe ser posterior al de inicio (${startTime}).`)
  }
}

export class InvalidDayOfWeekError extends SchedulingError {
  readonly code = 'SCHEDULING_INVALID_DAY_OF_WEEK'

  constructor(value: number) {
    super(`Día de la semana inválido: ${value}. Debe estar entre 0 (domingo) y 6 (sábado).`)
  }
}

export class InvalidDateError extends SchedulingError {
  readonly code = 'SCHEDULING_INVALID_DATE'

  constructor(value: string) {
    super(`Fecha inválida: ${value}. Formato esperado YYYY-MM-DD.`)
  }
}

// Caso de negocio esperable (dos feriados el mismo día para el mismo recurso), resuelto por el
// UNIQUE (resource_id, closed_date) de la base — se traduce acá en vez de relanzar el error crudo.
export class ClosedDateAlreadyExistsError extends SchedulingError {
  readonly code = 'SCHEDULING_CLOSED_DATE_EXISTS'

  constructor(closedDate: string) {
    super(`Ya existe un día no laborable registrado para el ${closedDate}.`)
  }
}

export class InvalidBlockRangeError extends SchedulingError {
  readonly code = 'SCHEDULING_INVALID_BLOCK_RANGE'

  constructor() {
    super('El bloqueo debe terminar después de empezar.')
  }
}
