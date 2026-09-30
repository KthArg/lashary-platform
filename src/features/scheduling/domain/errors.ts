// Errores de dominio de scheduling (DOM-006): cada uno hereda de DomainError con un code
// estable, para que el borde mapee a HTTP status sin adivinar por el texto del mensaje.

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
