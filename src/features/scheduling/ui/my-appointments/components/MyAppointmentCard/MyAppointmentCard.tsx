import Link from 'next/link'
import { reschedulePageMessages, reschedulePath } from '../../../reschedule/constants/reschedule-page-strings'
import { CancelAppointment } from '../CancelAppointment'
import { myAppointmentCardStyles as STYLES } from './MyAppointmentCard.styles'
import type { MyAppointmentCardProps } from './MyAppointmentCard.types'

export function MyAppointmentCard({ appointment, onCancelled }: MyAppointmentCardProps) {
  return (
    <li className={STYLES.card}>
      <p className={STYLES.slot}>{appointment.slot}</p>
      <p className={STYLES.service}>
        {appointment.service}
        {appointment.kind && <span className={STYLES.kindBadge}>{appointment.kind}</span>}
      </p>
      {appointment.amounts && <p className={STYLES.amounts}>{appointment.amounts}</p>}
      <p className={STYLES.status}>{appointment.status}</p>
      {appointment.heldNote && (
        <p role="note" className={STYLES.heldNote}>
          {appointment.heldNote}
        </p>
      )}
      <Link
        href={reschedulePath(appointment.id)}
        aria-label={reschedulePageMessages.rescheduleButtonLabel(appointment.slot)}
        className={STYLES.rescheduleLink}
      >
        {reschedulePageMessages.rescheduleButton}
      </Link>
      <CancelAppointment appointmentId={appointment.id} slot={appointment.slot} onCancelled={onCancelled} />
    </li>
  )
}
