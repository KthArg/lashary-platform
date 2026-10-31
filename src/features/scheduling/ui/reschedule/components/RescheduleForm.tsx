'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { MY_APPOINTMENTS_PATH } from '../../my-appointments/constants/my-appointments-strings'
import { reschedulePageMessages } from '../constants/reschedule-page-strings'
import { useRescheduleForm } from '../hooks/useRescheduleForm'
import { rescheduleStyles as STYLES } from '../styles/reschedule.styles'
import type { RescheduleView } from '../types/reschedule-view.types'
import { RescheduleSlotList } from './RescheduleSlotList'

type ReadyView = Extract<RescheduleView, { status: 'ready' }>

export function RescheduleForm({ view, intro }: { view: ReadyView; intro: ReactNode }) {
  const copy = reschedulePageMessages
  const { selectedStartsAtMs, state, select, submit } = useRescheduleForm(view.appointmentId, view.expectedStatus)

  if (state.status === 'done') {
    return (
      <div className={STYLES.form}>
        <div role="status" className={STYLES.success}>
          <span>{state.message}</span>
        </div>
        <Link href={MY_APPOINTMENTS_PATH} className={STYLES.back}>
          {copy.backToAppointments}
        </Link>
      </div>
    )
  }

  return (
    <form
      className={STYLES.form}
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {intro}
      <RescheduleSlotList slots={view.slots} selectedStartsAtMs={selectedStartsAtMs} onSelect={select} />
      <p role="note" className={STYLES.consequence}>
        {view.consequence}
      </p>
      {selectedStartsAtMs === null && <p className={STYLES.hint}>{copy.chooseSlot}</p>}
      {state.status === 'failed' && (
        <div role="alert" className={STYLES.alertError}>
          <span>{state.message}</span>
        </div>
      )}
      <button
        type="submit"
        disabled={selectedStartsAtMs === null || state.status === 'submitting'}
        className={STYLES.submit}
      >
        {state.status === 'submitting' ? copy.submitting : copy.confirmButton}
      </button>
    </form>
  )
}
