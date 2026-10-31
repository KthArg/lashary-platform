'use client'

import Link from 'next/link'
import { MY_APPOINTMENTS_PATH, myAppointmentsMessages } from '../../constants/my-appointments-strings'
import { useMyAppointmentsNotice } from '../../hooks/useMyAppointmentsNotice'
import { MyAppointmentsList } from '../MyAppointmentsList'
import { myAppointmentsContentStyles as STYLES } from './MyAppointmentsContent.styles'
import type { MyAppointmentsContentProps } from './MyAppointmentsContent.types'

function AppointmentsBody({ view, onCancelled }: MyAppointmentsContentProps & { onCancelled: (message: string) => void }) {
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
        </section>
      )
    case 'ready':
      return <MyAppointmentsList appointments={view.appointments} onCancelled={onCancelled} />
  }
}

export function MyAppointmentsContent({ view }: MyAppointmentsContentProps) {
  const { notice, noticeRef, showNotice } = useMyAppointmentsNotice()

  return (
    <>
      {notice && (
        <p role="status" tabIndex={-1} ref={noticeRef} className={STYLES.notice}>
          {notice}
        </p>
      )}
      <AppointmentsBody view={view} onCancelled={showNotice} />
    </>
  )
}
