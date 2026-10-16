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
