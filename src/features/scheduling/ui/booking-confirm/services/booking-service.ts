import { AUTH_ROLES, getAuthSession } from '@/features/auth'
import { listPackages, listTechniques } from '@/features/catalog'
import { systemClock } from '@/shared/clock'
import { createClient } from '@/shared/lib/supabase/server'
import { DEFAULT_RESOURCE_ID } from '../../../application/availability-ports'
import { bookAppointment } from '../../../application/book-appointment'
import { bookPackageAppointment } from '../../../application/book-package-appointment'
import { noDelinquencyYet } from '../../../application/no-delinquency'
import { createSupabaseBookingRepository } from '../../../db/booking-repository'
import { createSupabasePackageBookingRepository } from '../../../db/package-booking-repository'
import { MAX_CONFIRM_SERVICES } from '../constants/booking-confirm-strings'
import { performBooking, type BookingOutcome } from '../utils/perform-booking'
import type { BookingConfirmSearchParams } from '../types/booking-confirm.types'

export const bookingService = {
  async book(fields: BookingConfirmSearchParams): Promise<BookingOutcome> {
    const db = await createClient()
    return performBooking(fields, {
      resourceId: DEFAULT_RESOURCE_ID,
      isClient: async () => {
        const session = await getAuthSession()
        return Boolean(session?.user) && session?.role === AUTH_ROLES.CLIENTE
      },
      listTechniques: async () => (await listTechniques({ activeOnly: true, pageSize: MAX_CONFIRM_SERVICES })).items,
      listPackages: async () => (await listPackages({ activeOnly: true, pageSize: MAX_CONFIRM_SERVICES })).items,
      bookTechnique: bookAppointment({
        bookings: createSupabaseBookingRepository(db),
        delinquency: noDelinquencyYet,
      }),
      bookPackage: bookPackageAppointment({
        bookings: createSupabasePackageBookingRepository(db),
        delinquency: noDelinquencyYet,
      }),
      clock: systemClock,
    })
  },
}
