'use client'

import { myAppointmentsMessages } from '../../constants/my-appointments-strings'
import { useMyAppointmentsNotice } from '../../hooks/useMyAppointmentsNotice'
import { MyAppointmentCard } from '../MyAppointmentCard'
import { myAppointmentsListStyles as STYLES } from './MyAppointmentsList.styles'
import type { MyAppointmentsListProps } from './MyAppointmentsList.types'

export function MyAppointmentsList({ appointments }: MyAppointmentsListProps) {
  const { notice, showNotice } = useMyAppointmentsNotice()

  return (
    <>
      {notice && (
        <p role="status" className={STYLES.notice}>
          {notice}
        </p>
      )}
      <ul aria-label={myAppointmentsMessages.listLabel} className={STYLES.list}>
        {appointments.map((appointment) => (
          <MyAppointmentCard key={appointment.id} appointment={appointment} onCancelled={showNotice} />
        ))}
      </ul>
    </>
  )
}
