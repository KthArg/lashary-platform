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

export class InvalidDateError extends SchedulingDomainError {
  constructor(value: string) {
    super(`Fecha inválida: ${value}. Formato esperado YYYY-MM-DD.`)
  }
}

export class InvalidBlockRangeError extends SchedulingDomainError {
  constructor() {
    super('El bloqueo debe terminar después de empezar.')
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

export interface ClosedDateProps {
  id?: string
  resourceId: string
  closedDate: string // "YYYY-MM-DD"
  reason?: string
}

export class ClosedDate {
  readonly id?: string
  readonly resourceId: string
  readonly closedDate: string
  readonly reason?: string

  constructor(props: ClosedDateProps) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(props.closedDate)) throw new InvalidDateError(props.closedDate)
    this.id = props.id
    this.resourceId = props.resourceId
    this.closedDate = props.closedDate
    this.reason = props.reason
  }
}

// Capacidad base del bloqueo manual puntual (US-AGE-01); la UX completa (seleccionar varios,
// desbloquear, impedir bloquear sobre una cita existente) es alcance de US-AGE-07.
// startsAt/endsAt son Date ya construidos por quien llama — el dominio no instancia el reloj (DOM-004).
export interface ManualBlockProps {
  id?: string
  resourceId: string
  startsAt: Date
  endsAt: Date
  reason?: string
}

export class ManualBlock {
  readonly id?: string
  readonly resourceId: string
  readonly startsAt: Date
  readonly endsAt: Date
  readonly reason?: string

  constructor(props: ManualBlockProps) {
    if (props.endsAt.getTime() <= props.startsAt.getTime()) throw new InvalidBlockRangeError()
    this.id = props.id
    this.resourceId = props.resourceId
    this.startsAt = props.startsAt
    this.endsAt = props.endsAt
    this.reason = props.reason
  }
}
