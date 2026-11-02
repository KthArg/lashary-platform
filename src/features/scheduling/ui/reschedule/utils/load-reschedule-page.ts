import { isErr, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { studioDateOf } from '@/shared/studio-time'
import { getDaySlots } from '../../../application/day-slots'
import type { DayAvailabilityRepository } from '../../../application/availability-ports'
import type { RescheduleQuote, RescheduleQuoteError } from '../../../application/ports'
import { readCalendarParams } from '../../client-calendar/utils/calendar-params'
import { appointmentIdSchema } from '../../my-appointments/validation/appointment-id-schema'
import type { ReschedulePageData, RescheduleSearchParams } from '../types/reschedule-page.types'

export type ReschedulePageDeps = {
  isClient: () => Promise<boolean>
  quote: (appointmentId: string) => Promise<Result<RescheduleQuote, RescheduleQuoteError>>
  repo: DayAvailabilityRepository
  clock: Clock
  resourceId: string
}

export async function loadReschedulePage(
  rawAppointmentId: unknown,
  searchParams: RescheduleSearchParams,
  deps: ReschedulePageDeps,
): Promise<ReschedulePageData> {
  if (!(await deps.isClient())) return { status: 'forbidden' }

  const appointmentId = appointmentIdSchema.safeParse(rawAppointmentId)
  if (!appointmentId.success) return { status: 'notReschedulable' }

  const quote = await deps.quote(appointmentId.data)
  if (isErr(quote)) {
    switch (quote.error.code) {
      case 'SCHEDULING_CLIENT_NOT_REGISTERED':
        return { status: 'forbidden' }
      case 'SCHEDULING_APPOINTMENT_NOT_RESCHEDULABLE':
        return { status: 'notReschedulable' }
      case 'SCHEDULING_STORAGE_FAILED':
        return { status: 'failed' }
    }
  }
  if (quote.value.blockedBy !== null) return { status: 'blocked', quote: quote.value }

  const today = studioDateOf(deps.clock())
  const { date } = readCalendarParams(searchParams, today)
  const base = { quote: quote.value, date, today }

  const slots = await getDaySlots({ repo: deps.repo, clock: deps.clock })({
    resourceId: deps.resourceId,
    date,
    durationMin: quote.value.occupiedMinutes,
    ignoreAppointmentId: appointmentId.data,
  })
  if (isErr(slots)) return { ...base, status: 'invalid' }
  return { ...base, status: 'ready', slots: slots.value }
}
