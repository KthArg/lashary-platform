import { AUTH_ROLES, getAuthSession } from '@/features/auth'
import { listTechniques } from '@/features/catalog'
import { systemClock } from '@/shared/clock'
import { createClient } from '@/shared/lib/supabase/server'
import { quoteBooking } from '../../../application/quote-booking'
import { createSupabaseBookingQuoteRepository } from '../../../db/booking-quote-repository'
import { MAX_CONFIRM_SERVICES } from '../constants/booking-confirm-strings'
import { loadBookingConfirm } from '../utils/load-booking-confirm'
import { toBookingConfirmView } from '../utils/booking-confirm-format'
import type { BookingConfirmSearchParams, BookingConfirmView } from '../types/booking-confirm.types'

export const bookingConfirmService = {
  async load(searchParams: BookingConfirmSearchParams): Promise<BookingConfirmView> {
    const data = await loadBookingConfirm(searchParams, {
      isClient: async () => {
        const session = await getAuthSession()
        return Boolean(session?.user) && session?.role === AUTH_ROLES.CLIENTE
      },
      listTechniques: async () => (await listTechniques({ activeOnly: true, pageSize: MAX_CONFIRM_SERVICES })).items,
      quote: quoteBooking(createSupabaseBookingQuoteRepository(await createClient())),
      clock: systemClock,
    })
    return toBookingConfirmView(data)
  },
}
