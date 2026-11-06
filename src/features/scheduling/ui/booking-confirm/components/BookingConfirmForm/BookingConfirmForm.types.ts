import type { BookingSummaryView, ConfirmParams } from '../../types/booking-confirm.types'

export interface BookingConfirmFormProps {
  fields: ConfirmParams
  expectedPrice: number
  summary: BookingSummaryView
  backHref: string
}
