export type { ClosedDateProps, DayOfWeek, ManualBlockProps, WeeklyAvailabilityBlockProps } from './domain/availability'
export { ClosedDate, DAYS_OF_WEEK, ManualBlock, WeeklyAvailabilityBlock } from './domain/availability'
export type { Resource } from './domain/resource'
export {
  ClosedDateAlreadyExistsError,
  InvalidBlockRangeError,
  InvalidDateError,
  InvalidDayOfWeekError,
  InvalidTimeRangeError,
  SchedulingError,
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
