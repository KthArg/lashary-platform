'use client'

import { useActionState } from 'react'
import { schedulingMessages } from './messages'
import { defineClosedDateAction } from './actions'
import { initialActionState } from './action-state'
import { Feedback } from './Feedback'
import { closedDateFormStyles as s } from './ClosedDateForm.styles'

const f = schedulingMessages.closedDates.form

export function ClosedDateForm({ resourceId }: { resourceId: string }) {
  const [state, formAction, pending] = useActionState(defineClosedDateAction, initialActionState)

  return (
    <section className={s.section}>
      <h3 className={s.heading}>{f.legend}</h3>
      <Feedback {...state} />
      <form action={formAction} className={s.form}>
        <input type="hidden" name="resourceId" value={resourceId} />

        <label className={s.fieldLabel} htmlFor="closedDate">
          <span className={s.labelText}>{f.fields.closedDate}</span>
          <input id="closedDate" name="closedDate" type="date" required className={s.input} />
        </label>

        <label className={s.fieldLabel} htmlFor="closedDateReason">
          <span className={s.labelText}>{f.fields.reason}</span>
          <input id="closedDateReason" name="reason" type="text" className={s.input} />
        </label>

        <div className={s.submitWrapper}>
          <button type="submit" className={s.submitButton} disabled={pending}>
            {f.submit}
          </button>
        </div>
      </form>
    </section>
  )
}
