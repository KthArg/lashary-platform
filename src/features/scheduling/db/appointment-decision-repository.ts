import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import { appointmentNotPending, appointmentScheduleChanged, storageFailed } from '../domain/errors'
import type { AppointmentDecisionRepository } from '../application/ports'
import type { AppointmentDecision } from '../domain/appointment-decision.constants'
import {
  DECIDE_APPOINTMENT_FUNCTION,
  SCHEDULE_CHANGED_MESSAGE,
  SCHEDULE_DETAIL_SEPARATOR,
} from './appointment-repository.constants'

export function createSupabaseAppointmentDecisionRepository(
  db: SupabaseClient,
): AppointmentDecisionRepository {
  return {
    async decide(input) {
      const { data, error } = await db.rpc(DECIDE_APPOINTMENT_FUNCTION, {
        p_appointment_id: input.appointmentId,
        p_decision: input.decision,
        p_reason: input.reason,
        p_expected_starts_at:
          input.expectedStartsAtMs === undefined ? null : new Date(input.expectedStartsAtMs).toISOString(),
      })

      if (error?.message === SCHEDULE_CHANGED_MESSAGE) {
        const [startsAtMs, endsAtMs] = String(error.details ?? '').split(SCHEDULE_DETAIL_SEPARATOR).map(Number)
        if (Number.isFinite(startsAtMs) && Number.isFinite(endsAtMs)) {
          return err(appointmentScheduleChanged(input.appointmentId, startsAtMs, endsAtMs))
        }
      }
      if (error) return err(storageFailed(error.message))

      const decided = (data as Array<{ id: string; status: AppointmentDecision }> | null)?.[0]
      if (!decided) return err(appointmentNotPending(input.appointmentId))

      return ok({ id: decided.id, status: decided.status })
    },
  }
}
