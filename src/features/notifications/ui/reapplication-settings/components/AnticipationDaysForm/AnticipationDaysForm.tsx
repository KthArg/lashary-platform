'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { REAPPLICATION_ANTICIPATION_DAYS_MAX, REAPPLICATION_ANTICIPATION_DAYS_MIN } from '@/features/notifications/domain/reapplication-reminder'
import { setAnticipationDaysAction } from '../../actions/reapplication-settings-actions'
import { reapplicationSettingsMessages as copy } from '../../constants/reapplication-settings-strings'
import { FeedbackMessage, type Feedback } from '../FeedbackMessage'
import { anticipationDaysFormStyles as STYLES } from './AnticipationDaysForm.styles'
import type { AnticipationDaysFormProps } from './AnticipationDaysForm.types'

const INPUT_ID = 'notifications-reapplication-anticipation-days'

export function AnticipationDaysForm({ anticipationDays }: AnticipationDaysFormProps) {
  const [value, setValue] = useState(String(anticipationDays))
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<Feedback>(null)

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const result = await setAnticipationDaysAction({ anticipationDays: value.trim() === '' ? Number.NaN : Number(value) })
      if (!result.ok) {
        setFeedback({ kind: 'error', text: result.error })
        return
      }
      setValue(String(result.anticipationDays))
      setFeedback({ kind: 'ok', text: copy.saved })
    })
  }

  return (
    <form onSubmit={save} className={STYLES.form}>
      <div className={STYLES.field}>
        <label htmlFor={INPUT_ID} className={STYLES.label}>
          {copy.label(REAPPLICATION_ANTICIPATION_DAYS_MIN, REAPPLICATION_ANTICIPATION_DAYS_MAX)}
        </label>
        <input
          id={INPUT_ID}
          type="number"
          inputMode="numeric"
          min={REAPPLICATION_ANTICIPATION_DAYS_MIN}
          max={REAPPLICATION_ANTICIPATION_DAYS_MAX}
          step={1}
          value={value}
          disabled={pending}
          onChange={(event) => setValue(event.target.value)}
          className={STYLES.input}
        />
      </div>
      <button type="submit" className={STYLES.saveButton} disabled={pending}>
        {pending ? copy.saving : copy.save}
      </button>
      <FeedbackMessage feedback={feedback} />
    </form>
  )
}
