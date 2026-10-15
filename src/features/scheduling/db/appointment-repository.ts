import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import { spaceNotAvailable } from '../domain/errors'
import type { AppointmentRepository, NewAppointment } from '../application/ports'
import {
  CREATE_APPOINTMENT_FUNCTION,
  EXCLUSION_VIOLATION_CODE,
  OVERLAP_REJECTED_EVENT,
  RANGE_LOWER_BOUND,
  RANGE_UPPER_BOUND,
} from './appointment-repository.constants'

export type OverlapRejectedEvent = {
  event: typeof OVERLAP_REJECTED_EVENT
  resourceId: string
  occupiedFromMs: number
  occupiedUntilMs: number
}

export type OverlapReporter = (event: OverlapRejectedEvent) => void

// Registro estructurado por defecto: una línea JSON con el nombre fijo del evento.
export const logOverlapRejected: OverlapReporter = (event) => {
  console.error(JSON.stringify(event))
}

// La conversión de milisegundos a ISO vive aquí, no en domain/ ni application/ (DOM-004).
const toIso = (epochMs: number): string => new Date(epochMs).toISOString()

const toRangeLiteral = (fromMs: number, untilMs: number): string =>
  `${RANGE_LOWER_BOUND}${toIso(fromMs)},${toIso(untilMs)}${RANGE_UPPER_BOUND}`

export function createSupabaseAppointmentRepository(
  db: SupabaseClient,
  reportOverlap: OverlapReporter = logOverlapRejected,
): AppointmentRepository {
  return {
    async create(appointment: NewAppointment) {
      // Sin consulta de disponibilidad previa: la base decide (DOM-010).
      const { data, error } = await db.rpc(CREATE_APPOINTMENT_FUNCTION, {
        p_resource_id: appointment.resourceId,
        p_starts_at: toIso(appointment.startsAtMs),
        p_ends_at: toIso(appointment.endsAtMs),
        p_occupied_range: toRangeLiteral(appointment.occupiedFromMs, appointment.occupiedUntilMs),
      })

      if (error?.code === EXCLUSION_VIOLATION_CODE) {
        reportOverlap({
          event: OVERLAP_REJECTED_EVENT,
          resourceId: appointment.resourceId,
          occupiedFromMs: appointment.occupiedFromMs,
          occupiedUntilMs: appointment.occupiedUntilMs,
        })
        return err(spaceNotAvailable(appointment.resourceId))
      }
      // Cualquier otro fallo es inesperado: no se disfraza de resultado de negocio (DOM-006).
      if (error || !data) {
        throw new Error(`no se pudo crear la cita: ${error?.message ?? 'sin fila'}`)
      }

      return ok({ id: data.id as string, resourceId: data.resource_id as string })
    },
  }
}
