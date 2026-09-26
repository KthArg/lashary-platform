// Entry point público de scheduling (ARCH-003): lo único importable desde afuera.
// domain/ no importa de ninguna otra feature (ARCH-004).
export type { DayOfWeek, WeeklyAvailabilityBlockProps } from './domain/availability'
export { DAYS_OF_WEEK, WeeklyAvailabilityBlock } from './domain/availability'
export type { Resource } from './domain/resource'
export { InvalidDayOfWeekError, InvalidTimeRangeError, SchedulingError } from './domain/errors'

export type { SchedulingRepository } from './application/ports'
export { defineWeeklyAvailability, listWeeklyAvailability } from './application/manage-availability'
export { listResources } from './application/resources'

export { supabaseSchedulingRepository } from './db/supabase-scheduling-repository'
