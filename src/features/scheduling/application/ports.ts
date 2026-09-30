// Puerto que implementa db/ (Supabase). application/ y domain/ no conocen Supabase.
import type { WeeklyAvailabilityBlock } from '../domain/availability'
import type { Resource } from '../domain/resource'

export interface SchedulingRepository {
  listResources(): Promise<Resource[]>

  listWeeklyAvailability(resourceId: string): Promise<WeeklyAvailabilityBlock[]>
  saveWeeklyAvailability(block: WeeklyAvailabilityBlock): Promise<WeeklyAvailabilityBlock>
}
