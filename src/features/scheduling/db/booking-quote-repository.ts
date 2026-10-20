import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import { clientNotRegistered, storageFailed, techniqueNotAvailable } from '../domain/errors'
import type {
  BookingQuote,
  BookingQuoteRepository,
  QuoteBookingError,
} from '../application/ports'
import { BOOKING_ERROR_MESSAGES, NO_ROW_RETURNED } from './booking-repository.constants'
import { QUOTE_BOOKING_FUNCTION } from './booking-quote-repository.constants'

type QuoteRow = {
  technique_name: string
  price: number
  duration_min: number
  buffer_min: number
  deposit_due: number
}

function toQuoteError(message: string, techniqueId: string): QuoteBookingError {
  switch (message) {
    case BOOKING_ERROR_MESSAGES.clientNotRegistered:
      return clientNotRegistered()
    case BOOKING_ERROR_MESSAGES.techniqueNotAvailable:
      return techniqueNotAvailable(techniqueId)
    default:
      return storageFailed(message)
  }
}

function toBookingQuote(row: QuoteRow): BookingQuote {
  return {
    techniqueName: row.technique_name,
    servicePrice: row.price,
    durationMin: row.duration_min,
    bufferMin: row.buffer_min,
    depositDue: row.deposit_due,
  }
}

export function createSupabaseBookingQuoteRepository(db: SupabaseClient): BookingQuoteRepository {
  return {
    async quote(input) {
      const { data, error } = await db.rpc(QUOTE_BOOKING_FUNCTION, {
        p_technique_id: input.techniqueId,
        p_is_first_time: input.isFirstTime,
      })

      if (error) return err(toQuoteError(error.message, input.techniqueId))
      const [row] = (data ?? []) as QuoteRow[]
      if (!row) return err(storageFailed(NO_ROW_RETURNED))
      return ok(toBookingQuote(row))
    },
  }
}
