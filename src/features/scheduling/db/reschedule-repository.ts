import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import {
  appointmentNotReschedulable,
  clientNotRegistered,
  rescheduleLimitReached,
  rescheduleOutsideWindow,
  rescheduleSlotNotOffered,
  rescheduleSlotTaken,
  rescheduleStateChanged,
  storageFailed,
  tooManyPendingAppointments,
} from '../domain/errors'
import type { CancellableStatus } from '../domain/appointment-cancellation.constants'
import type { RescheduleBlock } from '../domain/appointment-reschedule.constants'
import type {
  RescheduledAppointment,
  RescheduleError,
  RescheduleQuote,
  RescheduleQuoteError,
  RescheduleRepository,
} from '../application/ports'
import { NO_ROW_RETURNED } from './booking-repository.constants'
import {
  QUOTE_RESCHEDULE_FUNCTION,
  RESCHEDULE_APPOINTMENT_FUNCTION,
  RESCHEDULE_ERROR_MESSAGES,
} from './reschedule-repository.constants'

type RescheduleRow = {
  appointment_id: string
  starts_at: string
  ends_at: string
  reschedule_count: number
}

type QuoteRow = {
  starts_at: string
  ends_at: string
  occupied_minutes: number
  technique_name: string
  status: CancellableStatus
  reschedule_count: number
  max_reschedules: number
  window_hours: number
  blocked_by: RescheduleBlock | null
}

const toIsoString = (epochMs: number): string => new Date(epochMs).toISOString()

function toRescheduleError(message: string, appointmentId: string): RescheduleError {
  switch (message) {
    case RESCHEDULE_ERROR_MESSAGES.clientNotRegistered:
      return clientNotRegistered()
    case RESCHEDULE_ERROR_MESSAGES.appointmentNotReschedulable:
      return appointmentNotReschedulable(appointmentId)
    case RESCHEDULE_ERROR_MESSAGES.outsideWindow:
      return rescheduleOutsideWindow(appointmentId)
    case RESCHEDULE_ERROR_MESSAGES.limitReached:
      return rescheduleLimitReached(appointmentId)
    case RESCHEDULE_ERROR_MESSAGES.stateChanged:
      return rescheduleStateChanged(appointmentId)
    case RESCHEDULE_ERROR_MESSAGES.slotNotOffered:
      return rescheduleSlotNotOffered(appointmentId)
    case RESCHEDULE_ERROR_MESSAGES.slotTaken:
      return rescheduleSlotTaken(appointmentId)
    case RESCHEDULE_ERROR_MESSAGES.tooManyPending:
      return tooManyPendingAppointments()
    default:
      return storageFailed(message)
  }
}

function toRescheduleQuoteError(message: string, appointmentId: string): RescheduleQuoteError {
  switch (message) {
    case RESCHEDULE_ERROR_MESSAGES.clientNotRegistered:
      return clientNotRegistered()
    case RESCHEDULE_ERROR_MESSAGES.appointmentNotReschedulable:
      return appointmentNotReschedulable(appointmentId)
    default:
      return storageFailed(message)
  }
}

function toRescheduleQuote(row: QuoteRow): RescheduleQuote {
  return {
    startsAtMs: Date.parse(row.starts_at),
    endsAtMs: Date.parse(row.ends_at),
    occupiedMinutes: Number(row.occupied_minutes),
    techniqueName: row.technique_name,
    status: row.status,
    rescheduleCount: Number(row.reschedule_count),
    maxReschedules: Number(row.max_reschedules),
    windowHours: Number(row.window_hours),
    blockedBy: row.blocked_by,
  }
}

function toRescheduledAppointment(row: RescheduleRow): RescheduledAppointment {
  return {
    appointmentId: row.appointment_id,
    startsAtMs: Date.parse(row.starts_at),
    endsAtMs: Date.parse(row.ends_at),
    rescheduleCount: Number(row.reschedule_count),
  }
}

export function createSupabaseRescheduleRepository(db: SupabaseClient): RescheduleRepository {
  return {
    async quote(appointmentId) {
      const { data, error } = await db.rpc(QUOTE_RESCHEDULE_FUNCTION, { p_appointment_id: appointmentId })

      if (error) return err(toRescheduleQuoteError(error.message, appointmentId))
      const [row] = (data ?? []) as QuoteRow[]
      if (!row) return err(storageFailed(NO_ROW_RETURNED))
      return ok(toRescheduleQuote(row))
    },

    async reschedule(input) {
      const { data, error } = await db.rpc(RESCHEDULE_APPOINTMENT_FUNCTION, {
        p_appointment_id: input.appointmentId,
        p_new_starts_at: toIsoString(input.newStartsAtMs),
        p_expected_status: input.expectedStatus,
      })

      if (error) return err(toRescheduleError(error.message, input.appointmentId))
      const [row] = (data ?? []) as RescheduleRow[]
      if (!row) return err(storageFailed(NO_ROW_RETURNED))
      return ok(toRescheduledAppointment(row))
    },
  }
}
