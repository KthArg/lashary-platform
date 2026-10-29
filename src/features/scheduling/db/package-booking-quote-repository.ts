import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import { clientNotRegistered, packageNotAvailable, storageFailed } from '../domain/errors'
import type {
  PackageBookingQuote,
  PackageBookingQuoteRepository,
  QuotePackageBookingError,
} from '../application/ports'
import { NO_ROW_RETURNED } from './booking-repository.constants'
import { PACKAGE_BOOKING_ERROR_MESSAGES } from './package-booking-repository.constants'
import { QUOTE_PACKAGE_BOOKING_FUNCTION } from './package-booking-quote-repository.constants'

type PackageQuoteRow = {
  package_name: string
  price: number
  duration_min: number
  buffer_min: number
  deposit_due: number
}

function toQuoteError(message: string, packageId: string): QuotePackageBookingError {
  switch (message) {
    case PACKAGE_BOOKING_ERROR_MESSAGES.clientNotRegistered:
      return clientNotRegistered()
    case PACKAGE_BOOKING_ERROR_MESSAGES.packageNotAvailable:
      return packageNotAvailable(packageId)
    default:
      return storageFailed(message)
  }
}

function toPackageBookingQuote(row: PackageQuoteRow): PackageBookingQuote {
  return {
    packageName: row.package_name,
    servicePrice: row.price,
    durationMin: row.duration_min,
    bufferMin: row.buffer_min,
    depositDue: row.deposit_due,
  }
}

export function createSupabasePackageBookingQuoteRepository(
  db: SupabaseClient,
): PackageBookingQuoteRepository {
  return {
    async quote(input) {
      const { data, error } = await db.rpc(QUOTE_PACKAGE_BOOKING_FUNCTION, {
        p_package_id: input.packageId,
      })

      if (error) return err(toQuoteError(error.message, input.packageId))
      const [row] = (data ?? []) as PackageQuoteRow[]
      if (!row) return err(storageFailed(NO_ROW_RETURNED))
      return ok(toPackageBookingQuote(row))
    },
  }
}
