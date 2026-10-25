import Link from 'next/link'
import { MY_APPOINTMENTS_PATH } from '../../my-appointments/constants/my-appointments-strings'
import { clientCalendarMessages } from '../../client-calendar/constants/client-calendar-strings'
import { DayNavigator } from '../../client-calendar/components/DayNavigator'
import { reschedulePageMessages } from '../constants/reschedule-page-strings'
import { rescheduleStyles as STYLES } from '../styles/reschedule.styles'
import type { RescheduleView as RescheduleViewModel } from '../types/reschedule-view.types'
import { RescheduleForm } from './RescheduleForm'

function BackLink() {
  return (
    <Link href={MY_APPOINTMENTS_PATH} className={STYLES.back}>
      {reschedulePageMessages.backToAppointments}
    </Link>
  )
}

function CurrentAppointment({ current }: { current: string }) {
  return (
    <section className={STYLES.current} aria-label={reschedulePageMessages.currentLegend}>
      <span className={STYLES.currentLegend}>{reschedulePageMessages.currentLegend}</span>
      <span>{current}</span>
    </section>
  )
}

function Alert({ message, kind }: { message: string; kind: 'alertError' | 'alertWarning' }) {
  return (
    <div role="alert" className={STYLES[kind]}>
      <span>{message}</span>
    </div>
  )
}

function RescheduleBody({ view }: { view: RescheduleViewModel }) {
  const copy = reschedulePageMessages

  switch (view.status) {
    case 'forbidden':
      return <Alert kind="alertError" message={copy.accessDenied} />
    case 'notReschedulable':
      return (
        <section className={STYLES.card}>
          <Alert kind="alertWarning" message={copy.notReschedulable} />
          <BackLink />
        </section>
      )
    case 'failed':
      return (
        <section className={STYLES.card}>
          <Alert kind="alertError" message={copy.failed} />
          <BackLink />
        </section>
      )
    case 'blocked':
      return (
        <section className={STYLES.card}>
          <CurrentAppointment current={view.current} />
          <Alert kind="alertWarning" message={view.message} />
          <BackLink />
        </section>
      )
    case 'invalid':
      return (
        <section className={STYLES.card}>
          <CurrentAppointment current={view.current} />
          <DayNavigator day={view.day} />
          <Alert kind="alertError" message={clientCalendarMessages.invalid} />
        </section>
      )
    case 'ready':
      return (
        <section className={STYLES.card}>
          <CurrentAppointment current={view.current} />
          <p className={STYLES.remaining}>{view.remaining}</p>
          <DayNavigator day={view.day} />
          <RescheduleForm view={view} />
        </section>
      )
  }
}

export function RescheduleView({ view }: { view: RescheduleViewModel }) {
  return (
    <div className={STYLES.main}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{reschedulePageMessages.title}</h1>
        <p className={STYLES.subtitle}>{reschedulePageMessages.subtitle}</p>
      </header>
      <RescheduleBody view={view} />
    </div>
  )
}
