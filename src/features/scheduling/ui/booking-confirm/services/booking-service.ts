import { AUTH_ROLES, getAuthSession } from '@/features/auth'
import { listTechniques } from '@/features/catalog'
import { systemClock } from '@/shared/clock'
import { createClient } from '@/shared/lib/supabase/server'
import { DEFAULT_RESOURCE_ID } from '../../../application/availability-ports'
import { bookAppointment } from '../../../application/book-appointment'
import { noDelinquencyYet } from '../../../application/no-delinquency'
import { createSupabaseBookingRepository } from '../../../db/booking-repository'
import { MAX_CONFIRM_SERVICES } from '../constants/booking-confirm-strings'
import { performBooking, type BookingOutcome } from '../utils/perform-booking'
import type { BookingConfirmSearchParams } from '../types/booking-confirm.types'

export const bookingService = {
  async book(fields: BookingConfirmSearchParams): Promise<BookingOutcome> {
    return performBooking(fields, {
      resourceId: DEFAULT_RESOURCE_ID,
      isClient: async () => {
        const session = await getAuthSession()
        return Boolean(session?.user) && session?.role === AUTH_ROLES.CLIENTE
      },
      listTechniques: async () => (await listTechniques({ activeOnly: true, pageSize: MAX_CONFIRM_SERVICES })).items,
      book: bookAppointment({
        bookings: createSupabaseBookingRepository(await createClient()),
        delinquency: noDelinquencyYet,
      }),
      clock: systemClock,
    })
  },
}
