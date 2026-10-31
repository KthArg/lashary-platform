import type { Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { studioDateOf, studioLocalToUtc } from '@/shared/studio-time'
import {
  findServiceOption,
  packageServiceOptionsOf,
  serviceOptionsOf,
  type NamedPackage,
  type NamedTechnique,
} from '../../../domain/service-option'
import { MS_PER_MINUTE } from '../../../domain/appointment-window.constants'
import type {
  BookAppointmentInput,
  BookPackageAppointmentInput,
  BookedAppointment,
  BookedPackageAppointment,
} from '../../../application/ports'
import type { BookAppointmentFailure } from '../../../application/book-appointment'
import type { BookPackageAppointmentFailure } from '../../../application/book-package-appointment'
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
  listPackages: () => Promise<readonly NamedPackage[]>
  bookTechnique: (input: BookAppointmentInput) => Promise<Result<BookedAppointment, BookAppointmentFailure>>
  bookPackage: (
    input: BookPackageAppointmentInput,
  ) => Promise<Result<BookedPackageAppointment, BookPackageAppointmentFailure>>
  clock: Clock
}

type FailureCode = (BookAppointmentFailure | BookPackageAppointmentFailure)['code']

const failureMessages: Partial<Record<FailureCode, string>> = {
  SCHEDULING_CLIENT_NOT_REGISTERED: bookingConfirmMessages.clientNotRegistered,
  SCHEDULING_CLIENT_HAS_ACTIVE_DELINQUENCY: bookingConfirmMessages.delinquency,
  SCHEDULING_TECHNIQUE_NOT_AVAILABLE: bookingConfirmMessages.unavailable,
  SCHEDULING_PACKAGE_NOT_AVAILABLE: bookingConfirmMessages.unavailable,
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
  const [techniques, packages] = await Promise.all([deps.listTechniques(), deps.listPackages()])
  const options = [...serviceOptionsOf(techniques), ...packageServiceOptionsOf(packages)]
  const selected = findServiceOption(options, params.serviceKey)
  if (!selected) return { kind: 'retry', backHref: backTo(CALENDAR_NOTICES.notOffered) }

  const startsAtMs = studioLocalToUtc(params.date, params.startMin).getTime()

  const result =
    selected.kind === 'package'
      ? await deps.bookPackage({ resourceId: deps.resourceId, startsAtMs, packageId: selected.packageId })
      : await deps.bookTechnique({
          resourceId: deps.resourceId,
          startsAtMs,
          techniqueId: selected.techniqueId,
          isFirstTime: selected.isFirstTime,
        })

  if (result.ok) {
    const booked = result.value
    const serviceName = 'packageName' in booked ? booked.packageName : booked.techniqueName
    const isFirstTime = 'isFirstTime' in booked ? booked.isFirstTime : null
    return {
      kind: 'booked',
      booked: {
        status: bookingConfirmMessages.pendingApproval,
        summary: toBookingSummary({
          serviceName,
          isFirstTime,
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
