import type { Result } from '@/shared/result'
import type {
  BookingQuote,
  BookingQuoteRepository,
  QuoteBookingError,
  QuoteBookingInput,
} from './ports'

export function quoteBooking(quotes: BookingQuoteRepository) {
  return function quote(input: QuoteBookingInput): Promise<Result<BookingQuote, QuoteBookingError>> {
    return quotes.quote(input)
  }
}
