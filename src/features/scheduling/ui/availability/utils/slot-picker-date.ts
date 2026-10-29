import { isCalendarDate } from '@/shared/studio-time'
import { SLOT_PICKER_DATE_PARAM } from '../constants/availability.constants'
import type { AvailabilitySearchParams } from '../types/slot-picker.types'

const firstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export function readSlotPickerDate(searchParams: AvailabilitySearchParams, today: string): string {
  const requestedDate = firstValue(searchParams[SLOT_PICKER_DATE_PARAM])
  return requestedDate && isCalendarDate(requestedDate) && requestedDate >= today ? requestedDate : today
}
