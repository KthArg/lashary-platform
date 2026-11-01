import { addCalendarDays, studioLocalToUtc } from '@/shared/studio-time'
import type { RescheduleQuote } from '../../../application/ports'
import { formatAppointmentSlot } from '../../appointment-display/utils/format-appointment-slot'
import { formatCalendarDate } from '../../availability/utils/availability-format'
import { toSlotViews } from '../../client-calendar/utils/client-calendar-format'
import type { DayView } from '../../client-calendar/types/client-calendar.types'
import { cancellationMessages } from '../../my-appointments/constants/cancellation-strings'
import { reschedulePageMessages, reschedulePath } from '../constants/reschedule-page-strings'
import type { ReschedulePageData } from '../types/reschedule-page.types'
import type { RescheduleSlotView, RescheduleView } from '../types/reschedule-view.types'

const toCurrent = (quote: RescheduleQuote): string =>
  reschedulePageMessages.current(quote.techniqueName, formatAppointmentSlot(quote.startsAtMs, quote.endsAtMs))

const toBlockedMessage = (quote: RescheduleQuote): string =>
  quote.blockedBy === 'outside_window'
    ? reschedulePageMessages.outsideWindow(cancellationMessages.hours(quote.windowHours))
    : reschedulePageMessages.limitReached(quote.maxReschedules)

const toSlotsWithInstant = (slots: Parameters<typeof toSlotViews>[0], date: string): RescheduleSlotView[] =>
  toSlotViews(slots).map((slot) => ({ ...slot, startsAtMs: studioLocalToUtc(date, slot.startMin).getTime() }))

const toConsequence = (quote: RescheduleQuote): string =>
  quote.status === 'pending_approval' ? reschedulePageMessages.keepsPending : reschedulePageMessages.backToPending

const toDay = (appointmentId: string, date: string, today: string): DayView => ({
  title: formatCalendarDate(date),
  previousHref: date > today ? reschedulePath(appointmentId, addCalendarDays(date, -1)) : null,
  nextHref: reschedulePath(appointmentId, addCalendarDays(date, 1)),
})

export function toRescheduleView(data: ReschedulePageData, appointmentId: string): RescheduleView {
  switch (data.status) {
    case 'forbidden':
    case 'notReschedulable':
    case 'failed':
      return { status: data.status }
    case 'blocked':
      return { status: 'blocked', current: toCurrent(data.quote), message: toBlockedMessage(data.quote) }
    case 'invalid':
      return { status: 'invalid', current: toCurrent(data.quote), day: toDay(appointmentId, data.date, data.today) }
    case 'ready':
      return {
        status: 'ready',
        appointmentId,
        expectedStatus: data.quote.status,
        current: toCurrent(data.quote),
        consequence: toConsequence(data.quote),
        remaining: reschedulePageMessages.remaining(data.quote.maxReschedules - data.quote.rescheduleCount),
        day: toDay(appointmentId, data.date, data.today),
        slots: toSlotsWithInstant(data.slots, data.date),
      }
  }
}
