// Entry point público de scheduling (ARCH-003): lo único importable desde afuera.
// domain/ no importa de ninguna otra feature (ARCH-004).
export type { ClosedDateProps, DayOfWeek, ManualBlockProps, WeeklyAvailabilityBlockProps } from './domain/availability'
export {
  ClosedDate,
  InvalidBlockRangeError,
  InvalidDateError,
  InvalidDayOfWeekError,
  InvalidTimeRangeError,
  ManualBlock,
  SchedulingDomainError,
  WeeklyAvailabilityBlock,
} from './domain/availability'

export type { SchedulingRepository } from './application/ports'
export {
  defineClosedDate,
  defineManualBlock,
  defineWeeklyAvailability,
  listClosedDates,
  listManualBlocks,
  listWeeklyAvailability,
} from './application/manage-availability'

export { supabaseSchedulingRepository } from './db/supabase-scheduling-repository'
