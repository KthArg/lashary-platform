import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { clientNotRegistered } from '../../domain/errors'
import { quoteBooking } from '../quote-booking'
import type { BookingQuote, BookingQuoteRepository, QuoteBookingInput } from '../ports'

const input: QuoteBookingInput = { techniqueId: 'tecnica-clasicas', isFirstTime: true }
const quote: BookingQuote = {
  techniqueName: 'Clásicas',
  servicePrice: 35000,
  durationMin: 60,
  bufferMin: 15,
  depositDue: 10000,
  promotionId: null,
  discountPercent: null,
}

function createFakeQuoteRepository(result: Awaited<ReturnType<BookingQuoteRepository['quote']>>) {
  const received: QuoteBookingInput[] = []
  const repository: BookingQuoteRepository = {
    async quote(quoteInput) {
      received.push(quoteInput)
      return result
    },
  }
  return { repository, received }
}

describe('quoteBooking', () => {
  it('pide la cotización de lo que eligió la clienta y la devuelve tal cual', async () => {
    const { repository, received } = createFakeQuoteRepository(ok(quote))
    const result = await quoteBooking(repository)(input)

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual(quote)
    expect(received).toEqual([input])
  })

  it('un error de la base llega como valor, no como excepción', async () => {
    const { repository } = createFakeQuoteRepository(err(clientNotRegistered()))
    const result = await quoteBooking(repository)(input)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_CLIENT_NOT_REGISTERED')
  })
})
