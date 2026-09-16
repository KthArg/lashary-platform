// Implementación Supabase del puerto SchedulingRepository. Mapeo fila↔dominio vive solo acá;
// fuera de domain/application, así que instanciar Date acá para parsear es legítimo (DOM-004).
import { createClient } from '@/shared/lib/supabase/server'
import { WeeklyAvailabilityBlock } from '../domain/availability'
import type { SchedulingRepository } from '../application/ports'

export const supabaseSchedulingRepository: SchedulingRepository = {
  async listWeeklyAvailability(resourceId) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('scheduling_weekly_availability')
      .select('id, resource_id, day_of_week, start_time, end_time')
      .eq('resource_id', resourceId)
    if (error) throw error
    return (data ?? []).map(
      (row) =>
        new WeeklyAvailabilityBlock({
          id: row.id,
          resourceId: row.resource_id,
          dayOfWeek: row.day_of_week,
          startTime: row.start_time,
          endTime: row.end_time,
        })
    )
  },

  async saveWeeklyAvailability(block) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('scheduling_weekly_availability')
      .insert({
        resource_id: block.resourceId,
        day_of_week: block.dayOfWeek,
        start_time: block.startTime,
        end_time: block.endTime,
      })
      .select('id, resource_id, day_of_week, start_time, end_time')
      .single()
    if (error) throw error
    return new WeeklyAvailabilityBlock({
      id: data.id,
      resourceId: data.resource_id,
      dayOfWeek: data.day_of_week,
      startTime: data.start_time,
      endTime: data.end_time,
    })
  },
}
