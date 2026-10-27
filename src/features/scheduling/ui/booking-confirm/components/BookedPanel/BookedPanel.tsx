import Link from 'next/link'
import { MY_APPOINTMENTS_PATH } from '../../../my-appointments/constants/my-appointments-strings'
import { bookingConfirmMessages } from '../../constants/booking-confirm-strings'
import { SummaryList } from '../SummaryList'
import { bookedPanelStyles as STYLES } from './BookedPanel.styles'
import type { BookedPanelProps } from './BookedPanel.types'

export function BookedPanel({ booked }: BookedPanelProps) {
  const copy = bookingConfirmMessages

  return (
    <div className={STYLES.panel}>
      <h2 className={STYLES.title}>{copy.bookedTitle}</h2>
      <p role="status" className={STYLES.status}>
        {booked.status}
      </p>
      <SummaryList summary={booked.summary} />
      <Link href={MY_APPOINTMENTS_PATH} className={STYLES.link}>
        {copy.backToCitas}
      </Link>
    </div>
  )
}
