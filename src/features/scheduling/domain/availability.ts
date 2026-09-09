// Dominio de disponibilidad (US-AGE-01). Invariantes en el constructor (DOM-007); el reloj
// no se instancia acá (DOM-004).

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export class SchedulingDomainError extends Error {}

export class InvalidTimeRangeError extends SchedulingDomainError {
  constructor(startTime: string, endTime: string) {
    super(`El horario de fin (${endTime}) debe ser posterior al de inicio (${startTime}).`)
  }
}

export class InvalidDayOfWeekError extends SchedulingDomainError {
  constructor(value: number) {
    super(`Día de la semana inválido: ${value}. Debe estar entre 0 (domingo) y 6 (sábado).`)
  }
}

export interface WeeklyAvailabilityBlockProps {
  id?: string
  resourceId: string
  dayOfWeek: DayOfWeek
  startTime: string // "HH:MM", 24h
  endTime: string
}

export class WeeklyAvailabilityBlock {
  readonly id?: string
  readonly resourceId: string
  readonly dayOfWeek: DayOfWeek
  readonly startTime: string
  readonly endTime: string

  constructor(props: WeeklyAvailabilityBlockProps) {
    if (props.dayOfWeek < 0 || props.dayOfWeek > 6) throw new InvalidDayOfWeekError(props.dayOfWeek)
    if (props.endTime <= props.startTime) throw new InvalidTimeRangeError(props.startTime, props.endTime)
    this.id = props.id
    this.resourceId = props.resourceId
    this.dayOfWeek = props.dayOfWeek
    this.startTime = props.startTime
    this.endTime = props.endTime
  }
}
