import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/server'
import type { BusyRange, OpenHours } from '../domain/day-slots'
import type { DayAvailabilityRepository } from '../application/availability-ports'

const OPEN_HOURS_FN = 'scheduling_open_hours'
const BUSY_RANGES_FN = 'scheduling_busy_ranges'

export type OpenHoursRow = { start_min: number; end_min: number }
export type BusyRangeRow = { starts_at: string; ends_at: string }

export const rowToOpenHours = (row: OpenHoursRow): OpenHours => ({
  startMin: row.start_min,
  endMin: row.end_min,
})

export const rowToBusyRange = (row: BusyRangeRow): BusyRange => ({
  startsAt: new Date(row.starts_at),
  endsAt: new Date(row.ends_at),
})

export function createSupabaseDayAvailabilityRepository(db: SupabaseClient): DayAvailabilityRepository {
  return {
    async listOpenHours(resourceId, date) {
      const { data, error } = await db.rpc(OPEN_HOURS_FN, { p_resource_id: resourceId, p_day: date })
      if (error) throw new Error(`${OPEN_HOURS_FN}: ${error.message}`)
      return ((data ?? []) as OpenHoursRow[]).map(rowToOpenHours)
    },

    async listBusyRanges(resourceId, date) {
      const { data, error } = await db.rpc(BUSY_RANGES_FN, { p_resource_id: resourceId, p_day: date })
      if (error) throw new Error(`${BUSY_RANGES_FN}: ${error.message}`)
      return ((data ?? []) as BusyRangeRow[]).map(rowToBusyRange)
    },
  }
}

export async function dayAvailabilityRepository(): Promise<DayAvailabilityRepository> {
  return createSupabaseDayAvailabilityRepository(await createClient())
}
