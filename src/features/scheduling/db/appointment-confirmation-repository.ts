import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import { appointmentNotConfirmable, invalidConfirmationDeadline, storageFailed } from '../domain/errors'
import type { AppointmentConfirmationRepository, ConfirmationPolicyRepository } from '../application/ports'
import { NO_ROW_RETURNED } from './booking-repository.constants'
import {
  APPOINTMENT_NOT_CONFIRMABLE_MESSAGE,
  CHANGE_CONFIRMATION_DEADLINE_FUNCTION,
  CONFIRM_APPOINTMENT_FUNCTION,
  CONFIRMATION_DEADLINE_COLUMN,
  CONFIRMATION_POLICY_NOT_FOUND,
  CONFIRMATION_POLICY_SINGLETON_COLUMN,
  CONFIRMATION_POLICY_TABLE,
  INVALID_CONFIRMATION_DEADLINE_MESSAGE,
} from './appointment-confirmation-repository.constants'

type ConfirmRow = { appointment_id: string; window_hours: number; deposit_required: number }
type PolicyRow = { confirmation_deadline_hours: number }
type ChangeRow = { previous_hours: number; new_hours: number }

export function createSupabaseAppointmentConfirmationRepository(db: SupabaseClient): AppointmentConfirmationRepository {
  return {
    async confirm(appointmentId) {
      const { data, error } = await db.rpc(CONFIRM_APPOINTMENT_FUNCTION, { p_appointment_id: appointmentId })

      if (error) {
        return err(
          error.message === APPOINTMENT_NOT_CONFIRMABLE_MESSAGE
            ? appointmentNotConfirmable(appointmentId)
            : storageFailed(error.message),
        )
      }
      const [row] = (data ?? []) as ConfirmRow[]
      if (!row) return err(storageFailed(NO_ROW_RETURNED))
      return ok({
        appointmentId: row.appointment_id,
        windowHours: Number(row.window_hours),
        depositRequired: Number(row.deposit_required),
      })
    },
  }
}

export function createSupabaseConfirmationPolicyRepository(db: SupabaseClient): ConfirmationPolicyRepository {
  return {
    async getDeadlineHours() {
      const { data, error } = await db
        .from(CONFIRMATION_POLICY_TABLE)
        .select(CONFIRMATION_DEADLINE_COLUMN)
        .eq(CONFIRMATION_POLICY_SINGLETON_COLUMN, true)
        .maybeSingle()

      if (error) return err(storageFailed(error.message))
      if (!data) return err(storageFailed(CONFIRMATION_POLICY_NOT_FOUND))
      return ok(Number((data as PolicyRow).confirmation_deadline_hours))
    },

    async changeDeadlineHours(hours) {
      const { data, error } = await db.rpc(CHANGE_CONFIRMATION_DEADLINE_FUNCTION, { p_hours: hours })

      if (error) {
        return err(
          error.message === INVALID_CONFIRMATION_DEADLINE_MESSAGE
            ? invalidConfirmationDeadline(hours)
            : storageFailed(error.message),
        )
      }
      const [row] = (data ?? []) as ChangeRow[]
      if (!row) return err(storageFailed(NO_ROW_RETURNED))
      return ok({ previousHours: Number(row.previous_hours), newHours: Number(row.new_hours) })
    },
  }
}
