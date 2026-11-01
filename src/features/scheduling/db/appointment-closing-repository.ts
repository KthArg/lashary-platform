import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import {
  appointmentNotChargeable,
  appointmentNotClosable,
  storageFailed,
  techniqueNotAvailable,
} from '../domain/errors'
import type { CloseOutcome } from '../domain/appointment-closing.constants'
import type {
  AppointmentClosingRepository,
  CloseAppointmentError,
  ClosedAppointment,
} from '../application/closing-ports'
import { NO_ROW_RETURNED } from './booking-repository.constants'
import { CLOSE_APPOINTMENT_FUNCTION, CLOSE_ERROR_MESSAGES } from './appointment-closing-repository.constants'

type CloseRow = {
  appointment_id: string
  outcome: CloseOutcome
  charge_amount: number
  deposit_credit: number
  amount_due: number
  forfeited_deposit: number
}

function toCloseError(message: string, appointmentId: string, deliveredTechniqueId?: string): CloseAppointmentError {
  switch (message) {
    case CLOSE_ERROR_MESSAGES.notClosable:
      return appointmentNotClosable(appointmentId)
    case CLOSE_ERROR_MESSAGES.notChargeable:
      return appointmentNotChargeable(appointmentId)
    case CLOSE_ERROR_MESSAGES.techniqueNotAvailable:
      return techniqueNotAvailable(deliveredTechniqueId ?? appointmentId)
    default:
      return storageFailed(message)
  }
}

function toClosedAppointment(row: CloseRow): ClosedAppointment {
  return {
    appointmentId: row.appointment_id,
    outcome: row.outcome,
    chargeAmount: Number(row.charge_amount),
    depositCredit: Number(row.deposit_credit),
    amountDue: Number(row.amount_due),
    forfeitedDeposit: Number(row.forfeited_deposit),
  }
}

export function createSupabaseAppointmentClosingRepository(db: SupabaseClient): AppointmentClosingRepository {
  return {
    async close(input) {
      const { data, error } = await db.rpc(CLOSE_APPOINTMENT_FUNCTION, {
        p_appointment_id: input.appointmentId,
        p_outcome: input.outcome,
        p_delivered_technique_id: input.deliveredTechniqueId ?? null,
      })

      if (error) return err(toCloseError(error.message, input.appointmentId, input.deliveredTechniqueId))
      const [row] = (data ?? []) as CloseRow[]
      if (!row) return err(storageFailed(NO_ROW_RETURNED))
      return ok(toClosedAppointment(row))
    },
  }
}
