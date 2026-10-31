import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { clientNotRegistered } from '../../domain/errors'
import { quotePackageBooking } from '../quote-package-booking'
import type { PackageBookingQuote, PackageBookingQuoteRepository, QuotePackageBookingInput } from '../ports'

const input: QuotePackageBookingInput = { packageId: 'paquete-combo' }
const quote: PackageBookingQuote = {
  packageName: 'Combo clásicas',
  servicePrice: 45000,
  durationMin: 90,
  bufferMin: 20,
  depositDue: 12000,
}

function createFakeQuoteRepository(result: Awaited<ReturnType<PackageBookingQuoteRepository['quote']>>) {
  const received: QuotePackageBookingInput[] = []
  const repository: PackageBookingQuoteRepository = {
    async quote(quoteInput) {
      received.push(quoteInput)
      return result
    },
  }
  return { repository, received }
}

describe('quotePackageBooking', () => {
  it('pide la cotización del paquete elegido y la devuelve tal cual', async () => {
    const { repository, received } = createFakeQuoteRepository(ok(quote))
    const result = await quotePackageBooking(repository)(input)

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual(quote)
    expect(received).toEqual([input])
  })

  it('un error de la base llega como valor, no como excepción', async () => {
    const { repository } = createFakeQuoteRepository(err(clientNotRegistered()))
    const result = await quotePackageBooking(repository)(input)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_CLIENT_NOT_REGISTERED')
  })
})
