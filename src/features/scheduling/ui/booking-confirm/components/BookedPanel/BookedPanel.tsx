import Link from 'next/link'
import { bookingConfirmMessages, PORTAL_CITAS_PATH } from '../../constants/booking-confirm-strings'
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
      <Link href={PORTAL_CITAS_PATH} className={STYLES.link}>
        {copy.backToCitas}
      </Link>
    </div>
  )
}
