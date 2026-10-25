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
      <CancelAppointment appointmentId={appointment.id} slot={appointment.slot} onCancelled={onCancelled} />
    </li>
  )
}
