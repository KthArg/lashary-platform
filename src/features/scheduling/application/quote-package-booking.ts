import type { Result } from '@/shared/result'
import type {
  PackageBookingQuote,
  PackageBookingQuoteRepository,
  QuotePackageBookingError,
  QuotePackageBookingInput,
} from './ports'

export function quotePackageBooking(quotes: PackageBookingQuoteRepository) {
  return function quote(
    input: QuotePackageBookingInput,
  ): Promise<Result<PackageBookingQuote, QuotePackageBookingError>> {
    return quotes.quote(input)
  }
}
