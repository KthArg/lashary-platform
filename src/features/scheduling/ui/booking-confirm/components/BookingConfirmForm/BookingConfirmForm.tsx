'use client'

import Link from 'next/link'
import { CALENDAR_PARAMS, SLOT_FIELD } from '../../../client-calendar/constants/client-calendar-strings'
import { bookingConfirmMessages } from '../../constants/booking-confirm-strings'
import { useBookingConfirm } from '../../hooks/useBookingConfirm'
import { BookedPanel } from '../BookedPanel'
import { SummaryList } from '../SummaryList'
import { bookingConfirmFormStyles as STYLES } from './BookingConfirmForm.styles'
import type { BookingConfirmFormProps } from './BookingConfirmForm.types'

export function BookingConfirmForm({ fields, summary, backHref }: BookingConfirmFormProps) {
  const copy = bookingConfirmMessages
  const { state, formAction, isPending } = useBookingConfirm()

  if (state.status === 'booked') return <BookedPanel booked={state.booked} />

  return (
    <form action={formAction} className={STYLES.form}>
      <SummaryList summary={summary} />
      <input type="hidden" name={CALENDAR_PARAMS.service} value={fields.serviceKey} />
      <input type="hidden" name={CALENDAR_PARAMS.date} value={fields.date} />
      <input type="hidden" name={SLOT_FIELD} value={fields.startMin} />
      {state.status === 'error' && (
        <div role="alert" className={STYLES.alertError}>
          <span>{state.message}</span>
        </div>
      )}
      <div className={STYLES.actions}>
        <button type="submit" disabled={isPending} className={STYLES.confirm}>
          {isPending ? copy.booking : copy.confirm}
        </button>
        <Link href={backHref} className={STYLES.back}>
          {copy.changeSlot}
        </Link>
      </div>
    </form>
  )
}
