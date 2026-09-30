'use client'

import { useActionState } from 'react'
import { DAYS_OF_WEEK } from '../domain/availability'
import { dayLabel, schedulingMessages } from './messages'
import { defineWeeklyAvailabilityAction } from './actions'
import { initialActionState } from './action-state'
import { Feedback } from './Feedback'
import { weeklyAvailabilityFormStyles as s } from './WeeklyAvailabilityForm.styles'

const f = schedulingMessages.weeklyAvailability.form

export function WeeklyAvailabilityForm({ resourceId }: { resourceId: string }) {
  const [state, formAction, pending] = useActionState(defineWeeklyAvailabilityAction, initialActionState)

  return (
    <section className={s.section}>
      <h3 className={s.heading}>{f.legend}</h3>
      <Feedback {...state} />
      <form action={formAction} className={s.form}>
        <input type="hidden" name="resourceId" value={resourceId} />

        <label className={s.fieldLabel} htmlFor="dayOfWeek">
          <span className={s.labelText}>{f.fields.dayOfWeek}</span>
          <select id="dayOfWeek" name="dayOfWeek" defaultValue={DAYS_OF_WEEK[1]} className={s.select}>
            {DAYS_OF_WEEK.map((day) => (
              <option key={day} value={day}>
                {dayLabel(day)}
              </option>
            ))}
          </select>
        </label>

        <label className={s.fieldLabel} htmlFor="startTime">
          <span className={s.labelText}>{f.fields.startTime}</span>
          <input id="startTime" name="startTime" type="time" required className={s.timeInput} />
        </label>

        <label className={s.fieldLabel} htmlFor="endTime">
          <span className={s.labelText}>{f.fields.endTime}</span>
          <input id="endTime" name="endTime" type="time" required className={s.timeInput} />
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
