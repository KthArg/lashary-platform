'use client'

import { useActionState } from 'react'
import { schedulingMessages } from './messages'
import { defineManualBlockAction } from './actions'
import { initialActionState } from './action-state'
import { Feedback } from './Feedback'
import { manualBlockFormStyles as s } from './ManualBlockForm.styles'

const f = schedulingMessages.manualBlocks.form

export function ManualBlockForm({ resourceId }: { resourceId: string }) {
  const [state, formAction, pending] = useActionState(defineManualBlockAction, initialActionState)

  return (
    <section className={s.section}>
      <h3 className={s.heading}>{f.legend}</h3>
      <Feedback {...state} />
      <form action={formAction} className={s.form}>
        <input type="hidden" name="resourceId" value={resourceId} />

        <label className={s.fieldLabel} htmlFor="startsAt">
          <span className={s.labelText}>{f.fields.startsAt}</span>
          <input id="startsAt" name="startsAt" type="datetime-local" required className={s.input} />
        </label>

        <label className={s.fieldLabel} htmlFor="endsAt">
          <span className={s.labelText}>{f.fields.endsAt}</span>
          <input id="endsAt" name="endsAt" type="datetime-local" required className={s.input} />
        </label>

        <label className={s.fieldLabel} htmlFor="manualBlockReason">
          <span className={s.labelText}>{f.fields.reason}</span>
          <input id="manualBlockReason" name="reason" type="text" className={s.input} />
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
