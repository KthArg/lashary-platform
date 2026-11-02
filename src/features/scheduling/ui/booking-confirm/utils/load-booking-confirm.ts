import { isErr } from '@/shared/result'
import type { Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { studioDateOf } from '@/shared/studio-time'
import {
  findServiceOption,
  packageServiceOptionsOf,
  serviceOptionsOf,
  type NamedPackage,
  type NamedTechnique,
} from '../../../domain/service-option'
import type {
  BookingQuote,
  PackageBookingQuote,
  QuoteBookingError,
  QuoteBookingInput,
  QuotePackageBookingError,
  QuotePackageBookingInput,
} from '../../../application/ports'
import { calendarHref } from '../../client-calendar/utils/calendar-params'
import { readConfirmParams } from './read-confirm-params'
import type { BookingConfirmData, BookingConfirmSearchParams } from '../types/booking-confirm.types'

export type BookingConfirmDeps = {
  isClient: () => Promise<boolean>
  listTechniques: () => Promise<readonly NamedTechnique[]>
  listPackages: () => Promise<readonly NamedPackage[]>
  quoteTechnique: (input: QuoteBookingInput) => Promise<Result<BookingQuote, QuoteBookingError>>
  quotePackage: (input: QuotePackageBookingInput) => Promise<Result<PackageBookingQuote, QuotePackageBookingError>>
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
  const [techniques, packages] = await Promise.all([deps.listTechniques(), deps.listPackages()])
  const options = [...serviceOptionsOf(techniques), ...packageServiceOptionsOf(packages)]
  const selected = findServiceOption(options, params.serviceKey)
  if (!selected) return { status: 'unavailable', backHref }

  if (selected.kind === 'package') {
    const quote = await deps.quotePackage({ packageId: selected.packageId })
    if (isErr(quote)) return { status: 'unavailable', backHref }
    return { status: 'ready', params, serviceName: selected.name, isFirstTime: null, quote: quote.value, backHref }
  }

  const quote = await deps.quoteTechnique({ techniqueId: selected.techniqueId, isFirstTime: selected.isFirstTime })
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
