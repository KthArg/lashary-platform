import { addCalendarDays, isCalendarDate } from '@/shared/studio-time'
import { DAILY_AGENDA_DATE_PARAM, DAILY_AGENDA_PATH } from '../constants/daily-agenda-strings'
import type { DailyAgendaSearchParams } from '../types/daily-agenda.types'

const firstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

const isNavigableDate = (date: string): boolean =>
  isCalendarDate(date) && isCalendarDate(addCalendarDays(date, -1)) && isCalendarDate(addCalendarDays(date, 1))

export function readAgendaDate(searchParams: DailyAgendaSearchParams, today: string): string {
  const requestedDate = firstValue(searchParams[DAILY_AGENDA_DATE_PARAM])
  return requestedDate && isNavigableDate(requestedDate) ? requestedDate : today
}

export const agendaDayHref = (date: string): string => `${DAILY_AGENDA_PATH}?${DAILY_AGENDA_DATE_PARAM}=${date}`
