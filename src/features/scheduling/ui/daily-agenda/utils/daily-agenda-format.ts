import { isErr, isOk, type Result } from '@/shared/result'
import { addCalendarDays, studioDateOf, studioLocalToUtc } from '@/shared/studio-time'
import type { UnclosedAppointment } from '@/features/scheduling/application/closing-ports'
import type { DailyAgenda } from '@/features/scheduling/application/daily-agenda'
import type { UnclosedAppointments } from '@/features/scheduling/application/list-unclosed-appointments'
import type { AgendaEntry } from '@/features/scheduling/domain/daily-agenda'
import type { DailyAgendaInvalid } from '@/features/scheduling/domain/availability-errors'
import type { StorageFailed } from '@/features/scheduling/domain/errors'
import { APPOINTMENT_DECISION, PENDING_APPROVAL_STATUS } from '@/features/scheduling/domain/appointment-decision.constants'
import { closeAsCompleted, closeAsNoShow, type ClosableAppointment } from '@/features/scheduling/domain/appointment-closing'
import { NO_AMOUNT, UNCLOSED_APPOINTMENTS_LIMIT } from '@/features/scheduling/domain/appointment-closing.constants'
import { DAILY_AGENDA_LIMIT } from '@/features/scheduling/domain/daily-agenda.constants'
import {
  APPOINTMENT_DISPLAY_CHOICE,
  APPOINTMENT_DISPLAY_FORMAT,
} from '../../appointment-display/constants/appointment-display.constants'
import { dailyAgendaMessages as COPY } from '../constants/daily-agenda-strings'
import type {
  AgendaDayNav,
  AgendaEntryView,
  ClientLinks,
  ClosingOptionView,
  DailyAgendaViewModel,
  UnclosedItemView,
  UnclosedSectionView,
} from '../types/daily-agenda.types'
import { agendaDayHref } from './agenda-date'
import { summarizeClosing } from './closing-summary'

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

const clientNameOf = (entry: Pick<AgendaEntry, 'clientId' | 'clientName'>): string => {
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

const closableOf = (appointment: UnclosedAppointment): ClosableAppointment => ({
  id: appointment.id,
  status: appointment.status,
  endsAtMs: appointment.endsAtMs,
  techniqueId: appointment.techniqueId ?? '',
  servicePrice: appointment.servicePrice ?? NO_AMOUNT,
  depositRegistered: appointment.depositRegistered,
})

function closingOptionsOf(appointment: UnclosedAppointment, nowMs: number): ClosingOptionView[] {
  const closable = closableOf(appointment)
  const options: ClosingOptionView[] = []
  const canCharge = appointment.clientId !== null && appointment.servicePrice !== null
  const completed = canCharge
    ? closeAsCompleted(closable, { techniqueId: closable.techniqueId, price: closable.servicePrice }, nowMs)
    : null
  if (completed && isOk(completed)) {
    options.push({ outcome: 'completed', label: COPY.close.completedLabel, summary: summarizeClosing(completed.value) })
  }
  const noShow = closeAsNoShow(closable, nowMs)
  if (isOk(noShow)) {
    options.push({ outcome: 'no_show', label: COPY.close.noShowLabel, summary: summarizeClosing(noShow.value) })
  }
  return options
}

const toUnclosedItemView = (appointment: UnclosedAppointment, nowMs: number): UnclosedItemView => {
  const date = studioDateOf(new Date(appointment.startsAtMs))
  const dayLabel = formatAgendaDay(date)
  return {
    id: appointment.id,
    when: `${dayLabel} · ${timeFormatter.format(appointment.startsAtMs)}`,
    clientName: clientNameOf(appointment),
    technique: appointment.techniqueName ?? APPOINTMENT_DISPLAY_CHOICE.noService,
    dayHref: agendaDayHref(date),
    dayLabel,
    options: closingOptionsOf(appointment, nowMs),
  }
}

export function toUnclosedSectionView(
  unclosed: Result<UnclosedAppointments, StorageFailed>,
  nowMs: number,
): UnclosedSectionView | null {
  if (isErr(unclosed)) return { status: 'error' }
  if (unclosed.value.appointments.length === 0) return null
  return {
    status: 'ready',
    items: unclosed.value.appointments.map((appointment) => toUnclosedItemView(appointment, nowMs)),
    truncatedNotice: unclosed.value.isTruncated ? COPY.unclosed.truncated(UNCLOSED_APPOINTMENTS_LIMIT) : null,
  }
}
