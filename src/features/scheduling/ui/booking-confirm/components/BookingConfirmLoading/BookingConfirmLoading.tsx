import { bookingConfirmMessages } from '../../constants/booking-confirm-strings'
import { bookingConfirmLoadingStyles as STYLES } from './BookingConfirmLoading.styles'

export function BookingConfirmLoading() {
  return (
    <div role="status" aria-live="polite" className={STYLES.box}>
      {bookingConfirmMessages.loading}
    </div>
  )
}
