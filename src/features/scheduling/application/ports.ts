// Puerto que implementa db/ (Supabase). application/ y domain/ no conocen Supabase.
import type { ClosedDate, ManualBlock, WeeklyAvailabilityBlock } from '../domain/availability'

export interface SchedulingRepository {
  listWeeklyAvailability(resourceId: string): Promise<WeeklyAvailabilityBlock[]>
  saveWeeklyAvailability(block: WeeklyAvailabilityBlock): Promise<WeeklyAvailabilityBlock>

  listClosedDates(resourceId: string): Promise<ClosedDate[]>
  saveClosedDate(closedDate: ClosedDate): Promise<ClosedDate>

  listManualBlocks(resourceId: string): Promise<ManualBlock[]>
  saveManualBlock(block: ManualBlock): Promise<ManualBlock>
}
