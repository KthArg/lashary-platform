import type { BookingConfirmSearchParams } from '../types/booking-confirm.types'

export function textFields(formData: FormData): BookingConfirmSearchParams {
  return Object.fromEntries(
    Array.from(formData.entries()).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}
