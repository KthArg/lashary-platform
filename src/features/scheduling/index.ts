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
