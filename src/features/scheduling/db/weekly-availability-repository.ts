import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import type { WeeklyBlock } from '../domain/weekly-availability'
import { weeklyBlockOverlap } from '../domain/availability-errors'
import type { WeeklyAvailabilityRepository } from '../application/availability-ports'

const TABLE = 'scheduling_weekly_availability'
const COLUMNS = 'id, resource_id, weekday, start_min, end_min'
const EXCLUSION_VIOLATION = '23P01'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type WeeklyBlockRow = {
  id: string
  resource_id: string
  weekday: number
  start_min: number
  end_min: number
}

export const rowToWeeklyBlock = (row: WeeklyBlockRow): WeeklyBlock => ({
  id: row.id,
  resourceId: row.resource_id,
  weekday: row.weekday,
  startMin: row.start_min,
  endMin: row.end_min,
})

export const weeklyBlockToRow = (block: WeeklyBlock): WeeklyBlockRow => ({
  id: block.id,
  resource_id: block.resourceId,
  weekday: block.weekday,
  start_min: block.startMin,
  end_min: block.endMin,
})

export function createSupabaseWeeklyAvailabilityRepository(
  db: SupabaseClient,
): WeeklyAvailabilityRepository {
  return {
    async listByResource(resourceId, limit) {
      const { data, error } = await db
        .from(TABLE)
        .select(COLUMNS)
        .eq('resource_id', resourceId)
        .order('weekday', { ascending: true })
        .order('start_min', { ascending: true })
        .limit(limit)
      if (error) throw new Error(`${TABLE}.listByResource: ${error.message}`)
      return (data ?? []).map((row) => rowToWeeklyBlock(row as WeeklyBlockRow))
    },

    async insert(block) {
      const { error } = await db.from(TABLE).insert(weeklyBlockToRow(block))
      if (!error) return ok(undefined)
      if (error.code === EXCLUSION_VIOLATION) return err(weeklyBlockOverlap(null))
      throw new Error(`${TABLE}.insert: ${error.message}`)
    },

    async remove(id) {
      if (!UUID.test(id)) return false
      const { data, error } = await db.from(TABLE).delete().eq('id', id).select('id')
      if (error) throw new Error(`${TABLE}.remove: ${error.message}`)
      return (data ?? []).length > 0
    },
  }
}

export async function weeklyAvailabilityRepository(): Promise<WeeklyAvailabilityRepository> {
  return createSupabaseWeeklyAvailabilityRepository(await createClient())
}
