// Entry point público de scheduling (ARCH-003): lo único importable desde afuera.
// domain/ no importa de ninguna otra feature (ARCH-004).
export type {
  ClosedDate,
  ClosedDateProps,
  DayOfWeek,
  ManualBlock,
  ManualBlockProps,
  WeeklyAvailabilityBlock,
  WeeklyAvailabilityBlockProps,
} from './domain/availability'
export { DAYS_OF_WEEK, createClosedDate, createManualBlock, createWeeklyAvailabilityBlock } from './domain/availability'
export type { Resource } from './domain/resource'
// Errores de scheduling: interfaces + función fábrica + guarda de tipo, sin `class` (ADR-0008).
// Solo se exportan como tipo — las fábricas y guardas son internas a scheduling/, nada externo
// las construye ni las revisa hoy.
export type {
  ClosedDateAlreadyExistsError,
  InvalidBlockRangeError,
  InvalidDateError,
  InvalidDayOfWeekError,
  InvalidTimeRangeError,
} from './domain/errors'

export type { SchedulingRepository } from './application/ports'
export {
  defineClosedDate,
  defineManualBlock,
  defineWeeklyAvailability,
  listClosedDates,
  listManualBlocks,
  listWeeklyAvailability,
} from './application/manage-availability'
export { listResources } from './application/resources'

export { supabaseSchedulingRepository } from './db/supabase-scheduling-repository'
export { AdminSchedulingPage } from './ui/AdminSchedulingPage'
