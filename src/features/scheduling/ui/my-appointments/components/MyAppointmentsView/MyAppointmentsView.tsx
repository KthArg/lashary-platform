import Link from 'next/link'
import {
  BOOK_APPOINTMENT_PATH,
  MY_APPOINTMENTS_PATH,
  myAppointmentsMessages,
} from '../../constants/my-appointments-strings'
import { MyAppointmentsList } from '../MyAppointmentsList'
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
      return <MyAppointmentsList appointments={view.appointments} />
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
