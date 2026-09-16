// Dominio de disponibilidad (US-AGE-01). Invariantes en el constructor (DOM-007); el reloj
// no se instancia acá (DOM-004).

import { InvalidDateError, InvalidDayOfWeekError, InvalidTimeRangeError } from './errors'

// Convención EXTRACT(DOW) de Postgres: 0 = domingo ... 6 = sábado. Único lugar donde el rango
// vive con nombre; el constructor lo valida desde acá, no con 0/6 repetidos a mano.
export const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6] as const
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

// Acepta "HH:MM" (lo que manda la UI) y "HH:MM:SS" (lo que devuelve Postgres) — ambos con
// hora en dos dígitos. "9:00" queda fuera a propósito: comparar horas como texto solo da el
// resultado correcto si están completas ("17:00" <= "9:00" es true como texto, y no debería).
const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

function toMinutesSinceMidnight(time: string): number {
  const [hours, minutes] = time.split(':')
  return Number(hours) * 60 + Number(minutes)
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
  startTime: string
  endTime: string
}

export class WeeklyAvailabilityBlock {
  readonly id?: string
  readonly resourceId: string
  readonly dayOfWeek: DayOfWeek
  readonly startTime: string
  readonly endTime: string

  constructor(props: WeeklyAvailabilityBlockProps) {
    if (!DAYS_OF_WEEK.includes(props.dayOfWeek)) throw new InvalidDayOfWeekError(props.dayOfWeek)
    if (!TIME_FORMAT.test(props.startTime) || !TIME_FORMAT.test(props.endTime)) {
      throw new InvalidTimeRangeError(props.startTime, props.endTime)
    }
    if (toMinutesSinceMidnight(props.endTime) <= toMinutesSinceMidnight(props.startTime)) {
      throw new InvalidTimeRangeError(props.startTime, props.endTime)
    }
    this.id = props.id
    this.resourceId = props.resourceId
    this.dayOfWeek = props.dayOfWeek
    this.startTime = props.startTime
    this.endTime = props.endTime
  }
}

// Días no laborables y feriados (AC-2, US-AGE-01). Fecha por recurso, única por
// (resource_id, closed_date) en la base — no en el dominio: dos llamadas concurrentes se
// resuelven en la base, no con una lectura-y-comparación en la aplicación.
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/

export interface ClosedDateProps {
  id?: string
  resourceId: string
  closedDate: string
  reason?: string
}

export class ClosedDate {
  readonly id?: string
  readonly resourceId: string
  readonly closedDate: string
  readonly reason?: string

  constructor(props: ClosedDateProps) {
    if (!DATE_FORMAT.test(props.closedDate)) throw new InvalidDateError(props.closedDate)
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
