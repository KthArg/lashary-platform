'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { GRACE_DAYS_MAX, GRACE_DAYS_MIN } from '@/features/delinquency/domain/grace-days'
import { setGraceDaysAction } from '@/features/delinquency/ui/review/actions/review-actions'
import { reviewMessages as copy } from '@/features/delinquency/ui/review/constants/review-strings'
import { FeedbackMessage, type Feedback } from '../FeedbackMessage'
import { graceDaysFormStyles as STYLES } from './GraceDaysForm.styles'
import type { GraceDaysFormProps } from './GraceDaysForm.types'

const INPUT_ID = 'delinquency-grace-days'

export function GraceDaysForm({ graceDays }: GraceDaysFormProps) {
  const [value, setValue] = useState(String(graceDays))
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<Feedback>(null)

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const result = await setGraceDaysAction({ graceDays: value.trim() === '' ? Number.NaN : Number(value) })
      if (!result.ok) {
        setFeedback({ kind: 'error', text: result.error })
        return
      }
      setValue(String(result.graceDays))
      setFeedback({ kind: 'ok', text: copy.grace.saved })
    })
  }

  return (
    <form onSubmit={save} className={STYLES.form}>
      <div className={STYLES.field}>
        <label htmlFor={INPUT_ID} className={STYLES.label}>
          {copy.grace.label}
        </label>
        <input
          id={INPUT_ID}
          type="number"
          inputMode="numeric"
          min={GRACE_DAYS_MIN}
          max={GRACE_DAYS_MAX}
          step={1}
          value={value}
          disabled={pending}
          onChange={(event) => setValue(event.target.value)}
          className={STYLES.input}
        />
      </div>
      <button type="submit" className={STYLES.saveButton} disabled={pending}>
        {pending ? copy.saving : copy.grace.save}
      </button>
      <FeedbackMessage feedback={feedback} />
    </form>
  )
}
