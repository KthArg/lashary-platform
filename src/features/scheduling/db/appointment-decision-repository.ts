import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import { appointmentNotPending } from '../domain/errors'
import type { AppointmentDecisionRepository } from '../application/ports'
import type { AppointmentDecision } from '../domain/appointment-decision.constants'
import { DECIDE_APPOINTMENT_FUNCTION } from './appointment-repository.constants'

export function createSupabaseAppointmentDecisionRepository(
  db: SupabaseClient,
): AppointmentDecisionRepository {
  return {
    async decide(input) {
      const { data, error } = await db.rpc(DECIDE_APPOINTMENT_FUNCTION, {
        p_appointment_id: input.appointmentId,
        p_decision: input.decision,
        p_reason: input.reason,
      })

      // Cualquier fallo de la base es inesperado: no se disfraza de resultado de negocio (DOM-006).
      if (error) throw new Error(`no se pudo decidir la cita: ${error.message}`)

      // Sin fila: la cita no existe, no es visible para quien llama o ya no estaba pendiente.
      const decided = (data as Array<{ id: string; status: AppointmentDecision }> | null)?.[0]
      if (!decided) return err(appointmentNotPending(input.appointmentId))

      return ok({ id: decided.id, status: decided.status })
    },
  }
}
