// Errores de la configuración de disponibilidad (US-AGE-01). Tipos + fábricas + guardas,
// discriminados por code y sin clases (DOM-006, ADR-0008).

export interface WeeklyBlockInvalid {
  readonly code: 'SCHEDULING_WEEKLY_BLOCK_INVALID'
  readonly problems: readonly string[]
  readonly message: string
}

export interface WeeklyBlockOverlap {
  readonly code: 'SCHEDULING_WEEKLY_BLOCK_OVERLAP'
  readonly conflictingId: string | null
  readonly message: string
}

export interface AvailabilityEntryNotFound {
  readonly code: 'SCHEDULING_AVAILABILITY_ENTRY_NOT_FOUND'
  readonly id: string
  readonly message: string
}

export interface ClosedDateInvalid {
  readonly code: 'SCHEDULING_CLOSED_DATE_INVALID'
  readonly problems: readonly string[]
  readonly message: string
}

export interface ClosedDateAlreadyExists {
  readonly code: 'SCHEDULING_CLOSED_DATE_ALREADY_EXISTS'
  readonly date: string
  readonly message: string
}

export interface ManualBlockInvalid {
  readonly code: 'SCHEDULING_MANUAL_BLOCK_INVALID'
  readonly problems: readonly string[]
  readonly message: string
}

export interface ManualBlockOverlap {
  readonly code: 'SCHEDULING_MANUAL_BLOCK_OVERLAP'
  readonly message: string
}

export interface ManualBlockHasAppointment {
  readonly code: 'SCHEDULING_MANUAL_BLOCK_HAS_APPOINTMENT'
  readonly message: string
}

export interface ClosedDateHasAppointment {
  readonly code: 'SCHEDULING_CLOSED_DATE_HAS_APPOINTMENT'
  readonly message: string
}

export interface WeeklyBlockHasAppointment {
  readonly code: 'SCHEDULING_WEEKLY_BLOCK_HAS_APPOINTMENT'
  readonly message: string
}

export interface ManualBlockNotBlocked {
  readonly code: 'SCHEDULING_MANUAL_BLOCK_NOT_BLOCKED'
  readonly message: string
}

export interface DaySlotsInvalid {
  readonly code: 'SCHEDULING_DAY_SLOTS_INVALID'
  readonly problems: readonly string[]
  readonly message: string
}

export const daySlotsInvalid = (problems: readonly string[]): DaySlotsInvalid => ({
  code: 'SCHEDULING_DAY_SLOTS_INVALID',
  problems,
  message: `no se pueden calcular los espacios del día: ${problems.join('; ')}`,
})

export const closedDateInvalid = (problems: readonly string[]): ClosedDateInvalid => ({
  code: 'SCHEDULING_CLOSED_DATE_INVALID',
  problems,
  message: `día cerrado inválido: ${problems.join('; ')}`,
})

export const closedDateAlreadyExists = (date: string): ClosedDateAlreadyExists => ({
  code: 'SCHEDULING_CLOSED_DATE_ALREADY_EXISTS',
  date,
  message: `el día ${date} ya está cerrado`,
})

export const manualBlockInvalid = (problems: readonly string[]): ManualBlockInvalid => ({
  code: 'SCHEDULING_MANUAL_BLOCK_INVALID',
  problems,
  message: `bloqueo inválido: ${problems.join('; ')}`,
})

export const manualBlockOverlap = (): ManualBlockOverlap => ({
  code: 'SCHEDULING_MANUAL_BLOCK_OVERLAP',
  message: 'el bloqueo se solapa con otro bloqueo',
})

export const manualBlockHasAppointment = (): ManualBlockHasAppointment => ({
  code: 'SCHEDULING_MANUAL_BLOCK_HAS_APPOINTMENT',
  message: 'el espacio tiene una cita activa; hay que resolverla antes de bloquearlo',
})

export const closedDateHasAppointment = (): ClosedDateHasAppointment => ({
  code: 'SCHEDULING_CLOSED_DATE_HAS_APPOINTMENT',
  message: 'el día tiene una cita activa; hay que resolverla antes de cerrarlo',
})

export const weeklyBlockHasAppointment = (): WeeklyBlockHasAppointment => ({
  code: 'SCHEDULING_WEEKLY_BLOCK_HAS_APPOINTMENT',
  message: 'el bloque tiene citas activas; hay que resolverlas antes de quitarlo',
})

export const manualBlockNotBlocked = (): ManualBlockNotBlocked => ({
  code: 'SCHEDULING_MANUAL_BLOCK_NOT_BLOCKED',
  message: 'alguno de los espacios elegidos ya no está bloqueado',
})

export const weeklyBlockInvalid = (problems: readonly string[]): WeeklyBlockInvalid => ({
  code: 'SCHEDULING_WEEKLY_BLOCK_INVALID',
  problems,
  message: `bloque semanal inválido: ${problems.join('; ')}`,
})

// conflictingId es null cuando el solape lo detecta la base (otra escritura concurrente) y no
// la validación previa.
export const weeklyBlockOverlap = (conflictingId: string | null): WeeklyBlockOverlap => ({
  code: 'SCHEDULING_WEEKLY_BLOCK_OVERLAP',
  conflictingId,
  message: 'el bloque se solapa con otro bloque del mismo día',
})

export const availabilityEntryNotFound = (id: string): AvailabilityEntryNotFound => ({
  code: 'SCHEDULING_AVAILABILITY_ENTRY_NOT_FOUND',
  id,
  message: `no existe la entrada de disponibilidad ${id}`,
})

const hasCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: unknown }).code === code

export const isWeeklyBlockInvalid = (error: unknown): error is WeeklyBlockInvalid =>
  hasCode(error, 'SCHEDULING_WEEKLY_BLOCK_INVALID')

export const isWeeklyBlockOverlap = (error: unknown): error is WeeklyBlockOverlap =>
  hasCode(error, 'SCHEDULING_WEEKLY_BLOCK_OVERLAP')

export const isAvailabilityEntryNotFound = (error: unknown): error is AvailabilityEntryNotFound =>
  hasCode(error, 'SCHEDULING_AVAILABILITY_ENTRY_NOT_FOUND')

export const isClosedDateInvalid = (error: unknown): error is ClosedDateInvalid =>
  hasCode(error, 'SCHEDULING_CLOSED_DATE_INVALID')

export const isClosedDateAlreadyExists = (error: unknown): error is ClosedDateAlreadyExists =>
  hasCode(error, 'SCHEDULING_CLOSED_DATE_ALREADY_EXISTS')

export const isManualBlockInvalid = (error: unknown): error is ManualBlockInvalid =>
  hasCode(error, 'SCHEDULING_MANUAL_BLOCK_INVALID')

export const isManualBlockOverlap = (error: unknown): error is ManualBlockOverlap =>
  hasCode(error, 'SCHEDULING_MANUAL_BLOCK_OVERLAP')

export const isClosedDateHasAppointment = (error: unknown): error is ClosedDateHasAppointment =>
  hasCode(error, 'SCHEDULING_CLOSED_DATE_HAS_APPOINTMENT')

export const isWeeklyBlockHasAppointment = (error: unknown): error is WeeklyBlockHasAppointment =>
  hasCode(error, 'SCHEDULING_WEEKLY_BLOCK_HAS_APPOINTMENT')

export const isManualBlockNotBlocked = (error: unknown): error is ManualBlockNotBlocked =>
  hasCode(error, 'SCHEDULING_MANUAL_BLOCK_NOT_BLOCKED')

export const isManualBlockHasAppointment = (error: unknown): error is ManualBlockHasAppointment =>
  hasCode(error, 'SCHEDULING_MANUAL_BLOCK_HAS_APPOINTMENT')

export const isDaySlotsInvalid = (error: unknown): error is DaySlotsInvalid =>
  hasCode(error, 'SCHEDULING_DAY_SLOTS_INVALID')

export interface DailyAgendaInvalid {
  readonly code: 'SCHEDULING_DAILY_AGENDA_INVALID'
  readonly message: string
}

export const dailyAgendaInvalid = (): DailyAgendaInvalid => ({
  code: 'SCHEDULING_DAILY_AGENDA_INVALID',
  message: 'la fecha de la agenda no es una fecha de calendario válida',
})

export const isDailyAgendaInvalid = (error: unknown): error is DailyAgendaInvalid =>
  hasCode(error, 'SCHEDULING_DAILY_AGENDA_INVALID')
