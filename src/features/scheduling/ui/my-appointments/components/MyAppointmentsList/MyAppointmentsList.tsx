import { myAppointmentsMessages } from '../../constants/my-appointments-strings'
import { MyAppointmentCard } from '../MyAppointmentCard'
import { myAppointmentsListStyles as STYLES } from './MyAppointmentsList.styles'
import type { MyAppointmentsListProps } from './MyAppointmentsList.types'

export function MyAppointmentsList({ appointments, onCancelled }: MyAppointmentsListProps) {
  return (
    <ul aria-label={myAppointmentsMessages.listLabel} className={STYLES.list}>
      {appointments.map((appointment) => (
        <MyAppointmentCard key={appointment.id} appointment={appointment} onCancelled={onCancelled} />
      ))}
    </ul>
  )
}
