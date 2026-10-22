import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import {
  appointmentNotCancellable,
  cancellationConsequenceChanged,
  clientNotRegistered,
  storageFailed,
} from '../domain/errors'
import type {
  CancellationError,
  CancellationQuote,
  CancellationRepository,
  CancelledAppointment,
} from '../application/ports'
import { NO_ROW_RETURNED } from './booking-repository.constants'
import {
  CANCEL_APPOINTMENT_FUNCTION,
  CANCELLATION_ERROR_MESSAGES,
  QUOTE_CANCELLATION_FUNCTION,
} from './cancellation-repository.constants'

type QuoteRow = {
  starts_at: string
  technique_name: string
  within_window: boolean
  forfeited_deposit: number
  window_hours: number
}

type CancelRow = {
  appointment_id: string
  within_window: boolean
  forfeited_deposit: number
}

function toCancellationError(message: string, appointmentId: string): CancellationError {
  switch (message) {
    case CANCELLATION_ERROR_MESSAGES.clientNotRegistered:
      return clientNotRegistered()
    case CANCELLATION_ERROR_MESSAGES.appointmentNotCancellable:
      return appointmentNotCancellable(appointmentId)
    case CANCELLATION_ERROR_MESSAGES.consequenceChanged:
      return cancellationConsequenceChanged(appointmentId)
    default:
      return storageFailed(message)
  }
}

function toCancellationQuote(row: QuoteRow): CancellationQuote {
  return {
    startsAtMs: Date.parse(row.starts_at),
    techniqueName: row.technique_name,
    withinWindow: row.within_window,
    windowHours: row.window_hours,
    forfeitedDeposit: Number(row.forfeited_deposit),
  }
}

function toCancelledAppointment(row: CancelRow): CancelledAppointment {
  return {
    appointmentId: row.appointment_id,
    withinWindow: row.within_window,
    forfeitedDeposit: Number(row.forfeited_deposit),
  }
}

export function createSupabaseCancellationRepository(db: SupabaseClient): CancellationRepository {
  return {
    async quote(appointmentId) {
      const { data, error } = await db.rpc(QUOTE_CANCELLATION_FUNCTION, {
        p_appointment_id: appointmentId,
      })

      if (error) return err(toCancellationError(error.message, appointmentId))
      const [row] = (data ?? []) as QuoteRow[]
      if (!row) return err(storageFailed(NO_ROW_RETURNED))
      return ok(toCancellationQuote(row))
    },

    async cancel(appointmentId, expectedForfeitedDeposit) {
      const { data, error } = await db.rpc(CANCEL_APPOINTMENT_FUNCTION, {
        p_appointment_id: appointmentId,
        p_expected_forfeited_deposit: expectedForfeitedDeposit,
      })

      if (error) return err(toCancellationError(error.message, appointmentId))
      const [row] = (data ?? []) as CancelRow[]
      if (!row) return err(storageFailed(NO_ROW_RETURNED))
      return ok(toCancelledAppointment(row))
    },
  }
}
