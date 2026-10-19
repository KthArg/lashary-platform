import { bookingConfirmService } from '../../services/booking-confirm-service'
import { BookingConfirmView } from '../BookingConfirmView'
import type { BookingConfirmPageProps } from './BookingConfirmPage.types'

export async function BookingConfirmPage({ searchParams }: BookingConfirmPageProps) {
  return <BookingConfirmView view={await bookingConfirmService.load(searchParams)} />
}
