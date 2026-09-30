// Implementación Supabase del puerto SchedulingRepository. Mapeo fila↔dominio vive solo acá;
// fuera de domain/application, así que instanciar Date acá para parsear sería legítimo si
// hiciera falta (DOM-004) — hoy no hace falta, start_time/end_time viajan como texto.
import { createClient } from '@/shared/lib/supabase/server'
import { WeeklyAvailabilityBlock, type DayOfWeek } from '../domain/availability'
import type { Resource } from '../domain/resource'
import type { SchedulingRepository } from '../application/ports'

const RESOURCES_TABLE = 'scheduling_resources'
const RESOURCES_COLUMNS = 'id, name'

const WEEKLY_AVAILABILITY_TABLE = 'scheduling_weekly_availability'
const WEEKLY_AVAILABILITY_COLUMNS = 'id, resource_id, day_of_week, start_time, end_time'

type WeeklyAvailabilityRow = {
  id: string
  resource_id: string
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
}

function weeklyAvailabilityRowToDomain(row: WeeklyAvailabilityRow): WeeklyAvailabilityBlock {
  return new WeeklyAvailabilityBlock({
    id: row.id,
    resourceId: row.resource_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
  })
}

export const supabaseSchedulingRepository: SchedulingRepository = {
  async listResources() {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from(RESOURCES_TABLE)
      .select(RESOURCES_COLUMNS)
      .order('created_at')
    if (error) throw error
    return (data ?? []) as Resource[]
  },

  async listWeeklyAvailability(resourceId) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from(WEEKLY_AVAILABILITY_TABLE)
      .select(WEEKLY_AVAILABILITY_COLUMNS)
      .eq('resource_id', resourceId)
      .order('day_of_week')
      .order('start_time')
    if (error) throw error
    return (data ?? []).map(weeklyAvailabilityRowToDomain)
  },

  async saveWeeklyAvailability(block) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from(WEEKLY_AVAILABILITY_TABLE)
      .insert({
        resource_id: block.resourceId,
        day_of_week: block.dayOfWeek,
        start_time: block.startTime,
        end_time: block.endTime,
      })
      .select(WEEKLY_AVAILABILITY_COLUMNS)
      .single()
    if (error) throw error
    return weeklyAvailabilityRowToDomain(data)
  },
}
