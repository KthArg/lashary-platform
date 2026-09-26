// Implementación Supabase del puerto SchedulingRepository. Mapeo fila↔dominio vive solo acá;
// fuera de domain/application, así que instanciar Date acá para parsear sería legítimo si
// hiciera falta (DOM-004) — hoy no hace falta, start_time/end_time viajan como texto.
import { createClient } from '@/shared/lib/supabase/server'
import { ClosedDate, WeeklyAvailabilityBlock, type DayOfWeek } from '../domain/availability'
import { ClosedDateAlreadyExistsError } from '../domain/errors'
import type { Resource } from '../domain/resource'
import type { SchedulingRepository } from '../application/ports'

const POSTGRES_UNIQUE_VIOLATION = '23505'

const RESOURCES_TABLE = 'scheduling_resources'
const RESOURCES_COLUMNS = 'id, name'

const WEEKLY_AVAILABILITY_TABLE = 'scheduling_weekly_availability'
const WEEKLY_AVAILABILITY_COLUMNS = 'id, resource_id, day_of_week, start_time, end_time'

const CLOSED_DATES_TABLE = 'scheduling_closed_dates'
const CLOSED_DATES_COLUMNS = 'id, resource_id, closed_date, reason'

type WeeklyAvailabilityRow = {
  id: string
  resource_id: string
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
}

type ClosedDateRow = {
  id: string
  resource_id: string
  closed_date: string
  reason: string | null
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

function closedDateRowToDomain(row: ClosedDateRow): ClosedDate {
  return new ClosedDate({
    id: row.id,
    resourceId: row.resource_id,
    closedDate: row.closed_date,
    reason: row.reason ?? undefined,
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

  async listClosedDates(resourceId) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from(CLOSED_DATES_TABLE)
      .select(CLOSED_DATES_COLUMNS)
      .eq('resource_id', resourceId)
      .order('closed_date')
    if (error) throw error
    return (data ?? []).map(closedDateRowToDomain)
  },

  async saveClosedDate(closedDate) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from(CLOSED_DATES_TABLE)
      .insert({
        resource_id: closedDate.resourceId,
        closed_date: closedDate.closedDate,
        reason: closedDate.reason ?? null,
      })
      .select(CLOSED_DATES_COLUMNS)
      .single()
    if (error) {
      if (error.code === POSTGRES_UNIQUE_VIOLATION) throw new ClosedDateAlreadyExistsError(closedDate.closedDate)
      throw error
    }
    return closedDateRowToDomain(data)
  },
}
