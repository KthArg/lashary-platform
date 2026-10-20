import { isErr } from '@/shared/result'
import type { Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { studioDateOf } from '@/shared/studio-time'
import { findServiceOption, serviceOptionsOf, type NamedTechnique } from '../../../domain/service-option'
import type { BookingQuote, QuoteBookingError, QuoteBookingInput } from '../../../application/ports'
import { calendarHref } from '../../client-calendar/utils/calendar-params'
import { readConfirmParams } from './read-confirm-params'
import type { BookingConfirmData, BookingConfirmSearchParams } from '../types/booking-confirm.types'

export type BookingConfirmDeps = {
  isClient: () => Promise<boolean>
  listTechniques: () => Promise<readonly NamedTechnique[]>
  quote: (input: QuoteBookingInput) => Promise<Result<BookingQuote, QuoteBookingError>>
  clock: Clock
}

export async function loadBookingConfirm(
  searchParams: BookingConfirmSearchParams,
  deps: BookingConfirmDeps,
): Promise<BookingConfirmData> {
  if (!(await deps.isClient())) return { status: 'forbidden' }

  const params = readConfirmParams(searchParams, studioDateOf(deps.clock()))
  if (!params) return { status: 'invalid', backHref: calendarHref({}) }

  const backHref = calendarHref({ serviceKey: params.serviceKey, date: params.date })
  const selected = findServiceOption(serviceOptionsOf(await deps.listTechniques()), params.serviceKey)
  if (!selected) return { status: 'unavailable', backHref }

  const quote = await deps.quote({ techniqueId: selected.techniqueId, isFirstTime: selected.isFirstTime })
  if (isErr(quote)) return { status: 'unavailable', backHref }

  return {
    status: 'ready',
    params,
    serviceName: selected.name,
    isFirstTime: selected.isFirstTime,
    quote: quote.value,
    backHref,
  }
}
