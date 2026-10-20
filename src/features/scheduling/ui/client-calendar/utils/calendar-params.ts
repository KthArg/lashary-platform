import { isCalendarDate } from '@/shared/studio-time'
import { CALENDAR_NOTICES, CALENDAR_PARAMS, CLIENT_CALENDAR_PATH, type CalendarNotice } from '../constants/client-calendar-strings'
import type { CalendarParams, CalendarSearchParams } from '../types/client-calendar.types'

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export function readCalendarParams(searchParams: CalendarSearchParams, today: string): CalendarParams {
  const serviceKey = single(searchParams[CALENDAR_PARAMS.service]) || undefined
  const requested = single(searchParams[CALENDAR_PARAMS.date])
  const date = requested && isCalendarDate(requested) && requested >= today ? requested : today
  const requestedNotice = single(searchParams[CALENDAR_PARAMS.notice])
  const notice = Object.values(CALENDAR_NOTICES).find((known) => known === requestedNotice)
  return { serviceKey, date, notice }
}

export const calendarRequestKey = (searchParams: CalendarSearchParams): string =>
  `${single(searchParams[CALENDAR_PARAMS.service]) ?? ''}|${single(searchParams[CALENDAR_PARAMS.date]) ?? ''}`

export function calendarHref({
  serviceKey,
  date,
  notice,
}: {
  serviceKey?: string
  date?: string
  notice?: CalendarNotice
}): string {
  const query = new URLSearchParams()
  if (serviceKey) query.set(CALENDAR_PARAMS.service, serviceKey)
  if (date) query.set(CALENDAR_PARAMS.date, date)
  if (notice) query.set(CALENDAR_PARAMS.notice, notice)
  const search = query.toString()
  return search ? `${CLIENT_CALENDAR_PATH}?${search}` : CLIENT_CALENDAR_PATH
}
