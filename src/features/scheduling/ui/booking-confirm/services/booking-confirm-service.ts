import { AUTH_ROLES, getAuthSession } from '@/features/auth'
import { listPackages, listTechniques } from '@/features/catalog'
import { systemClock } from '@/shared/clock'
import { createClient } from '@/shared/lib/supabase/server'
import { quoteBooking } from '../../../application/quote-booking'
import { quotePackageBooking } from '../../../application/quote-package-booking'
import { createSupabaseBookingQuoteRepository } from '../../../db/booking-quote-repository'
import { createSupabasePackageBookingQuoteRepository } from '../../../db/package-booking-quote-repository'
import { MAX_CONFIRM_SERVICES } from '../constants/booking-confirm-strings'
import { loadBookingConfirm } from '../utils/load-booking-confirm'
import { toBookingConfirmView } from '../utils/booking-confirm-format'
import type { BookingConfirmSearchParams, BookingConfirmView } from '../types/booking-confirm.types'

export const bookingConfirmService = {
  async load(searchParams: BookingConfirmSearchParams): Promise<BookingConfirmView> {
    const db = await createClient()
    const data = await loadBookingConfirm(searchParams, {
      isClient: async () => {
        const session = await getAuthSession()
        return Boolean(session?.user) && session?.role === AUTH_ROLES.CLIENTE
      },
      listTechniques: async () => (await listTechniques({ activeOnly: true, pageSize: MAX_CONFIRM_SERVICES })).items,
      listPackages: async () => (await listPackages({ activeOnly: true, pageSize: MAX_CONFIRM_SERVICES })).items,
      quoteTechnique: quoteBooking(createSupabaseBookingQuoteRepository(db)),
      quotePackage: quotePackageBooking(createSupabasePackageBookingQuoteRepository(db)),
      clock: systemClock,
    })
    return toBookingConfirmView(data)
  },
}
