import Link from 'next/link'
import {
  BOOK_APPOINTMENT_PATH,
  MY_APPOINTMENTS_PATH,
  myAppointmentsMessages,
} from '../../constants/my-appointments-strings'
import { MyAppointmentCard } from '../MyAppointmentCard'
import { myAppointmentsViewStyles as STYLES } from './MyAppointmentsView.styles'
import type { MyAppointmentsViewProps } from './MyAppointmentsView.types'

function AppointmentsBody({ view }: MyAppointmentsViewProps) {
  const copy = myAppointmentsMessages

  switch (view.status) {
    case 'forbidden':
      return (
        <div role="alert" className={STYLES.alertError}>
          <span>{copy.accessDenied}</span>
        </div>
      )
    case 'error':
      return (
        <div role="alert" className={STYLES.alertError}>
          <span>{copy.loadFailed}</span>
          <Link href={MY_APPOINTMENTS_PATH} className={STYLES.action}>
            {copy.reload}
          </Link>
        </div>
      )
    case 'empty':
      return (
        <section className={STYLES.emptyBox}>
          <p>{copy.empty}</p>
          <Link href={BOOK_APPOINTMENT_PATH} className={STYLES.action}>
            {copy.bookCta}
          </Link>
        </section>
      )
    case 'ready':
      return (
        <ul aria-label={copy.listLabel} className={STYLES.list}>
          {view.appointments.map((appointment) => (
            <MyAppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </ul>
      )
  }
}

export function MyAppointmentsView({ view }: MyAppointmentsViewProps) {
  const copy = myAppointmentsMessages

  return (
    <div className={STYLES.main}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{copy.title}</h1>
        <p className={STYLES.subtitle}>{copy.subtitle}</p>
      </header>
      <AppointmentsBody view={view} />
    </div>
  )
}
