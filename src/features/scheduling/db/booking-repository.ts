import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import {
  clientNotRegistered,
  slotNotOffered,
  spaceNotAvailable,
  storageFailed,
  techniqueNotAvailable,
} from '../domain/errors'
import type {
  BookAppointmentError,
  BookAppointmentInput,
  BookedAppointment,
  BookingRepository,
} from '../application/ports'
import { OVERLAP_REJECTED_EVENT } from './appointment-repository.constants'
import { BOOK_APPOINTMENT_FUNCTION, BOOKING_ERROR_MESSAGES } from './booking-repository.constants'

export type BookingOverlapEvent = {
  event: typeof OVERLAP_REJECTED_EVENT
  resourceId: string
  startsAtMs: number
}

export type BookingOverlapReporter = (event: BookingOverlapEvent) => void

export const logBookingOverlap: BookingOverlapReporter = (event) => {
  console.error(JSON.stringify(event))
}

type AppointmentRow = {
  id: string
  resource_id: string
  starts_at: string
  ends_at: string
  technique_name: string
  service_price: number
  deposit_required: number
  deposit_registered: number
  is_first_time: boolean
}

const toIso = (epochMs: number): string => new Date(epochMs).toISOString()

function toBookedAppointment(row: AppointmentRow): BookedAppointment {
  return {
    id: row.id,
    resourceId: row.resource_id,
    startsAtMs: Date.parse(row.starts_at),
    endsAtMs: Date.parse(row.ends_at),
    techniqueName: row.technique_name,
    servicePrice: row.service_price,
    depositRequired: row.deposit_required,
    depositRegistered: row.deposit_registered,
    isFirstTime: row.is_first_time,
  }
}

function toBookingError(message: string, input: BookAppointmentInput): BookAppointmentError {
  switch (message) {
    case BOOKING_ERROR_MESSAGES.clientNotRegistered:
      return clientNotRegistered()
    case BOOKING_ERROR_MESSAGES.techniqueNotAvailable:
      return techniqueNotAvailable(input.techniqueId)
    case BOOKING_ERROR_MESSAGES.slotNotOffered:
      return slotNotOffered(input.resourceId)
    case BOOKING_ERROR_MESSAGES.slotTaken:
      return spaceNotAvailable(input.resourceId)
    default:
      return storageFailed(message)
  }
}

export function createSupabaseBookingRepository(
  db: SupabaseClient,
  reportOverlap: BookingOverlapReporter = logBookingOverlap,
): BookingRepository {
  return {
    async book(input) {
      const { data, error } = await db.rpc(BOOK_APPOINTMENT_FUNCTION, {
        p_resource_id: input.resourceId,
        p_starts_at: toIso(input.startsAtMs),
        p_technique_id: input.techniqueId,
        p_is_first_time: input.isFirstTime,
      })

      if (error) return err(toBookingError(error.message, input))
      if (!data || !(data as AppointmentRow).id) {
        reportOverlap({ event: OVERLAP_REJECTED_EVENT, resourceId: input.resourceId, startsAtMs: input.startsAtMs })
        return err(spaceNotAvailable(input.resourceId))
      }
      return ok(toBookedAppointment(data as AppointmentRow))
    },
  }
}
