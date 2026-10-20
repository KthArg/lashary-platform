import { isCalendarDate } from '@/shared/studio-time'
import { CALENDAR_PARAMS, SLOT_FIELD } from '../../client-calendar/constants/client-calendar-strings'
import type { BookingConfirmSearchParams, ConfirmParams } from '../types/booking-confirm.types'

const MINUTES_PER_DAY = 1440

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export function readConfirmParams(searchParams: BookingConfirmSearchParams, today: string): ConfirmParams | null {
  const serviceKey = single(searchParams[CALENDAR_PARAMS.service])
  const date = single(searchParams[CALENDAR_PARAMS.date])
  const startMin = Number(single(searchParams[SLOT_FIELD]))
  const validSlot = Number.isInteger(startMin) && startMin >= 0 && startMin < MINUTES_PER_DAY
  if (!serviceKey || !date || !isCalendarDate(date) || date < today || !validSlot) return null
  return { serviceKey, date, startMin }
}
