import { clientCalendarMessages } from '../../constants/client-calendar-strings'
import { clientCalendarLoadingStyles as STYLES } from './ClientCalendarLoading.styles'

export function ClientCalendarLoading() {
  return (
    <div role="status" aria-live="polite" className={STYLES.box}>
      {clientCalendarMessages.loading}
    </div>
  )
}
