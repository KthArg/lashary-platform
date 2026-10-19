import type { Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { studioDateOf, studioLocalToUtc } from '@/shared/studio-time'
import { findServiceOption, serviceOptionsOf, type NamedTechnique } from '../../../domain/service-option'
import { MS_PER_MINUTE } from '../../../domain/appointment-window.constants'
import type { BookAppointmentInput, BookedAppointment } from '../../../application/ports'
import type { BookAppointmentFailure } from '../../../application/book-appointment'
import { CALENDAR_NOTICES, type CalendarNotice } from '../../client-calendar/constants/client-calendar-strings'
import { calendarHref } from '../../client-calendar/utils/calendar-params'
import { bookingConfirmMessages } from '../constants/booking-confirm-strings'
import { toBookingSummary } from './booking-confirm-format'
import { readConfirmParams } from './read-confirm-params'
import type { BookingConfirmSearchParams } from '../types/booking-confirm.types'
import type { BookedView } from '../types/booking-action-state'

export type BookingOutcome =
  | { kind: 'booked'; booked: BookedView }
  | { kind: 'retry'; backHref: string }
  | { kind: 'failed'; message: string }

export type PerformBookingDeps = {
  resourceId: string
  isClient: () => Promise<boolean>
  listTechniques: () => Promise<readonly NamedTechnique[]>
  book: (input: BookAppointmentInput) => Promise<Result<BookedAppointment, BookAppointmentFailure>>
  clock: Clock
}

type FailureCode = BookAppointmentFailure['code']

const failureMessages: Partial<Record<FailureCode, string>> = {
  SCHEDULING_CLIENT_NOT_REGISTERED: bookingConfirmMessages.clientNotRegistered,
  SCHEDULING_CLIENT_HAS_ACTIVE_DELINQUENCY: bookingConfirmMessages.delinquency,
  SCHEDULING_TECHNIQUE_NOT_AVAILABLE: bookingConfirmMessages.unavailable,
  SCHEDULING_TOO_MANY_PENDING_APPOINTMENTS: bookingConfirmMessages.tooManyPending,
}

const retryNotices: Partial<Record<FailureCode, CalendarNotice>> = {
  SCHEDULING_SPACE_NOT_AVAILABLE: CALENDAR_NOTICES.taken,
  SCHEDULING_SLOT_NOT_OFFERED: CALENDAR_NOTICES.notOffered,
}

export async function performBooking(
  fields: BookingConfirmSearchParams,
  deps: PerformBookingDeps,
): Promise<BookingOutcome> {
  if (!(await deps.isClient())) return { kind: 'failed', message: bookingConfirmMessages.accessDenied }

  const params = readConfirmParams(fields, studioDateOf(deps.clock()))
  if (!params) return { kind: 'retry', backHref: calendarHref({ notice: CALENDAR_NOTICES.notOffered }) }

  const backTo = (notice?: CalendarNotice) => calendarHref({ serviceKey: params.serviceKey, date: params.date, notice })
  const selected = findServiceOption(serviceOptionsOf(await deps.listTechniques()), params.serviceKey)
  if (!selected) return { kind: 'retry', backHref: backTo(CALENDAR_NOTICES.notOffered) }

  const result = await deps.book({
    resourceId: deps.resourceId,
    startsAtMs: studioLocalToUtc(params.date, params.startMin).getTime(),
    techniqueId: selected.techniqueId,
    isFirstTime: selected.isFirstTime,
  })

  if (result.ok) {
    const booked = result.value
    return {
      kind: 'booked',
      booked: {
        status: bookingConfirmMessages.pendingApproval,
        summary: toBookingSummary({
          serviceName: booked.techniqueName,
          isFirstTime: booked.isFirstTime,
          date: params.date,
          startMin: params.startMin,
          durationMin: (booked.endsAtMs - booked.startsAtMs) / MS_PER_MINUTE,
          price: booked.servicePrice,
          depositDue: booked.depositRequired,
        }),
      },
    }
  }

  const { code } = result.error
  const notice = retryNotices[code]
  if (notice) return { kind: 'retry', backHref: backTo(notice) }
  return { kind: 'failed', message: failureMessages[code] ?? bookingConfirmMessages.storageFailed }
}
