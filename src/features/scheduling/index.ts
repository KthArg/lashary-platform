// Entry point público de scheduling (ARCH-003): lo único importable desde afuera.
// domain/ no importa de ninguna otra feature (ARCH-004).
export type { ClosedDateProps, DayOfWeek, WeeklyAvailabilityBlockProps } from './domain/availability'
export { ClosedDate, DAYS_OF_WEEK, WeeklyAvailabilityBlock } from './domain/availability'
export type { Resource } from './domain/resource'
export {
  ClosedDateAlreadyExistsError,
  InvalidDateError,
  InvalidDayOfWeekError,
  InvalidTimeRangeError,
  SchedulingError,
} from './domain/errors'

export type { SchedulingRepository } from './application/ports'
export {
  defineClosedDate,
  defineWeeklyAvailability,
  listClosedDates,
  listWeeklyAvailability,
} from './application/manage-availability'
export { listResources } from './application/resources'

export { supabaseSchedulingRepository } from './db/supabase-scheduling-repository'
