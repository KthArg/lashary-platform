import { isErr, type Result } from '@/shared/result'
import { addCalendarDays, studioLocalToUtc } from '@/shared/studio-time'
import type { DailyAgenda } from '@/features/scheduling/application/daily-agenda'
import type { AgendaEntry } from '@/features/scheduling/domain/daily-agenda'
import type { DailyAgendaInvalid } from '@/features/scheduling/domain/availability-errors'
import type { StorageFailed } from '@/features/scheduling/domain/errors'
import { APPOINTMENT_DECISION, PENDING_APPROVAL_STATUS } from '@/features/scheduling/domain/appointment-decision.constants'
import { DAILY_AGENDA_LIMIT } from '@/features/scheduling/domain/daily-agenda.constants'
import {
  APPOINTMENT_DISPLAY_CHOICE,
  APPOINTMENT_DISPLAY_FORMAT,
} from '../../appointment-display/constants/appointment-display.constants'
import { dailyAgendaMessages as COPY } from '../constants/daily-agenda-strings'
import type { AgendaDayNav, AgendaEntryView, ClientLinks, DailyAgendaViewModel } from '../types/daily-agenda.types'
import { agendaDayHref } from './agenda-date'

const NOON_MIN = 12 * 60

const dayFormatter = new Intl.DateTimeFormat(APPOINTMENT_DISPLAY_FORMAT.locale, {
  dateStyle: 'full',
  timeZone: APPOINTMENT_DISPLAY_FORMAT.timeZone,
})

const timeFormatter = new Intl.DateTimeFormat(APPOINTMENT_DISPLAY_FORMAT.locale, {
  timeStyle: 'short',
  timeZone: APPOINTMENT_DISPLAY_FORMAT.timeZone,
})

export const formatAgendaDay = (date: string): string => dayFormatter.format(studioLocalToUtc(date, NOON_MIN))

export function buildAgendaDayNav(date: string, today: string): AgendaDayNav {
  return {
    dayLabel: formatAgendaDay(date),
    currentHref: agendaDayHref(date),
    previousHref: agendaDayHref(addCalendarDays(date, -1)),
    nextHref: agendaDayHref(addCalendarDays(date, 1)),
    todayHref: agendaDayHref(today),
    isToday: date === today,
  }
}

const visitOf = (isFirstTime: boolean | null): string | null => {
  if (isFirstTime === null) return null
  return isFirstTime ? APPOINTMENT_DISPLAY_CHOICE.firstTime : APPOINTMENT_DISPLAY_CHOICE.retouch
}

const clientNameOf = (entry: AgendaEntry): string => {
  if (entry.clientId === null) return COPY.noClient
  return entry.clientName ?? COPY.unnamedClient
}

const paymentOf = (entry: AgendaEntry): string => {
  if (entry.status === APPOINTMENT_DECISION.REJECTED) return COPY.paymentNotApplicable
  return entry.paymentStatus ? COPY.payment[entry.paymentStatus] : COPY.noPayment
}

export function toAgendaEntryView(entry: AgendaEntry, clientLinks: ClientLinks): AgendaEntryView {
  const clientName = clientNameOf(entry)
  return {
    id: entry.id,
    time: COPY.timeRange(timeFormatter.format(entry.startsAtMs), timeFormatter.format(entry.endsAtMs)),
    duration: COPY.duration(entry.durationMin),
    clientName,
    technique: entry.techniqueName ?? APPOINTMENT_DISPLAY_CHOICE.noService,
    visit: visitOf(entry.isFirstTime),
    delinquency: entry.hasActiveDelinquency ? COPY.delinquent : null,
    payment: paymentOf(entry),
    status: COPY.status[entry.status],
    isPending: entry.status === PENDING_APPROVAL_STATUS,
    isRejected: entry.status === APPOINTMENT_DECISION.REJECTED,
    links: entry.clientId
      ? {
          ...clientLinks(entry.clientId),
          recordLabel: COPY.openRecordLabel(clientName),
          appointmentsLabel: COPY.clientAppointmentsLabel(clientName),
        }
      : null,
  }
}

export function toDailyAgendaViewModel(input: {
  date: string
  today: string
  agenda: Result<DailyAgenda, DailyAgendaInvalid | StorageFailed>
  clientLinks: ClientLinks
}): DailyAgendaViewModel {
  const nav = buildAgendaDayNav(input.date, input.today)
  if (isErr(input.agenda)) return { nav, status: 'error' }
  if (input.agenda.value.entries.length === 0) return { nav, status: 'empty' }
  return {
    nav,
    status: 'ready',
    entries: input.agenda.value.entries.map((entry) => toAgendaEntryView(entry, input.clientLinks)),
    truncatedNotice: input.agenda.value.isTruncated ? COPY.truncated(DAILY_AGENDA_LIMIT) : null,
    delinquencyNotice: input.agenda.value.isDelinquencyUnavailable ? COPY.delinquencyUnavailable : null,
  }
}
