import type { BookingSummaryView, ConfirmParams } from '../../types/booking-confirm.types'

export interface BookingConfirmFormProps {
  fields: ConfirmParams
  summary: BookingSummaryView
  backHref: string
}
