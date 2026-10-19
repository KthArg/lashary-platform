import { isCalendarDate } from '@/shared/studio-time'
import { CALENDAR_PARAMS, CLIENT_CALENDAR_PATH } from '../constants/client-calendar-strings'
import type { CalendarParams, CalendarSearchParams } from '../types/client-calendar.types'

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export function readCalendarParams(searchParams: CalendarSearchParams, today: string): CalendarParams {
  const serviceKey = single(searchParams[CALENDAR_PARAMS.service]) || undefined
  const requested = single(searchParams[CALENDAR_PARAMS.date])
  const date = requested && isCalendarDate(requested) && requested >= today ? requested : today
  return { serviceKey, date }
}

export const calendarRequestKey = (searchParams: CalendarSearchParams): string =>
  `${single(searchParams[CALENDAR_PARAMS.service]) ?? ''}|${single(searchParams[CALENDAR_PARAMS.date]) ?? ''}`

export function calendarHref({ serviceKey, date }: { serviceKey?: string; date?: string }): string {
  const query = new URLSearchParams()
  if (serviceKey) query.set(CALENDAR_PARAMS.service, serviceKey)
  if (date) query.set(CALENDAR_PARAMS.date, date)
  const search = query.toString()
  return search ? `${CLIENT_CALENDAR_PATH}?${search}` : CLIENT_CALENDAR_PATH
}
