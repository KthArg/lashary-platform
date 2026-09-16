// Entry point público de scheduling (ARCH-003): lo único importable desde afuera.
// domain/ no importa de ninguna otra feature (ARCH-004).
export type { ClosedDateProps, DayOfWeek, WeeklyAvailabilityBlockProps } from './domain/availability'
export {
  ClosedDate,
  InvalidDateError,
  InvalidDayOfWeekError,
  InvalidTimeRangeError,
  SchedulingDomainError,
  WeeklyAvailabilityBlock,
} from './domain/availability'

export type { SchedulingRepository } from './application/ports'
export {
  defineClosedDate,
  defineWeeklyAvailability,
  listClosedDates,
  listWeeklyAvailability,
} from './application/manage-availability'

export { supabaseSchedulingRepository } from './db/supabase-scheduling-repository'
