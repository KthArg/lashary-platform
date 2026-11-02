import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import {
  clientNotRegistered,
  packageNotAvailable,
  slotNotOffered,
  spaceNotAvailable,
  storageFailed,
  tooManyPendingAppointments,
} from '../domain/errors'
import type {
  BookPackageAppointmentError,
  BookPackageAppointmentInput,
  BookedPackageAppointment,
  PackageBookingRepository,
} from '../application/ports'
import { OVERLAP_REJECTED_EVENT } from './appointment-repository.constants'
import type { BookingOverlapEvent, BookingOverlapReporter } from './booking-repository'
import { logBookingOverlap } from './booking-repository'
import { BOOK_PACKAGE_APPOINTMENT_FUNCTION, PACKAGE_BOOKING_ERROR_MESSAGES } from './package-booking-repository.constants'

type PackageAppointmentRow = {
  id: string
  resource_id: string
  starts_at: string
  ends_at: string
  package_name: string
  service_price: number
  deposit_required: number
  deposit_registered: number
}

const toIso = (epochMs: number): string => new Date(epochMs).toISOString()

function toBookedPackageAppointment(row: PackageAppointmentRow): BookedPackageAppointment {
  return {
    id: row.id,
    resourceId: row.resource_id,
    startsAtMs: Date.parse(row.starts_at),
    endsAtMs: Date.parse(row.ends_at),
    packageName: row.package_name,
    servicePrice: row.service_price,
    depositRequired: row.deposit_required,
    depositRegistered: row.deposit_registered,
  }
}

function toBookingError(message: string, input: BookPackageAppointmentInput): BookPackageAppointmentError {
  switch (message) {
    case PACKAGE_BOOKING_ERROR_MESSAGES.clientNotRegistered:
      return clientNotRegistered()
    case PACKAGE_BOOKING_ERROR_MESSAGES.packageNotAvailable:
      return packageNotAvailable(input.packageId)
    case PACKAGE_BOOKING_ERROR_MESSAGES.slotNotOffered:
      return slotNotOffered(input.resourceId)
    case PACKAGE_BOOKING_ERROR_MESSAGES.slotTaken:
      return spaceNotAvailable(input.resourceId)
    case PACKAGE_BOOKING_ERROR_MESSAGES.tooManyPending:
      return tooManyPendingAppointments()
    default:
      return storageFailed(message)
  }
}

export function createSupabasePackageBookingRepository(
  db: SupabaseClient,
  reportOverlap: BookingOverlapReporter = logBookingOverlap,
): PackageBookingRepository {
  return {
    async book(input) {
      const { data, error } = await db.rpc(BOOK_PACKAGE_APPOINTMENT_FUNCTION, {
        p_resource_id: input.resourceId,
        p_starts_at: toIso(input.startsAtMs),
        p_package_id: input.packageId,
      })

      if (error) return err(toBookingError(error.message, input))
      if (!data || !(data as PackageAppointmentRow).id) {
        const event: BookingOverlapEvent = {
          event: OVERLAP_REJECTED_EVENT,
          resourceId: input.resourceId,
          startsAtMs: input.startsAtMs,
        }
        reportOverlap(event)
        return err(spaceNotAvailable(input.resourceId))
      }
      return ok(toBookedPackageAppointment(data as PackageAppointmentRow))
    },
  }
}
