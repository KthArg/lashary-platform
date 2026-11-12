'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { GRACE_DAYS_MAX, GRACE_DAYS_MIN } from '@/features/delinquency/domain/grace-days'
import { setGraceDaysAction } from '@/features/delinquency/ui/review/actions/review-actions'
import { reviewMessages as copy } from '@/features/delinquency/ui/review/constants/review-strings'
import { reviewStyles as STYLES } from '@/features/delinquency/ui/review/styles/review.styles'

type Feedback = { kind: 'ok'; text: string } | { kind: 'error'; text: string } | null

const INPUT_ID = 'delinquency-grace-days'

export function GraceDaysForm({ graceDays }: { graceDays: number }) {
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
    <form onSubmit={save} className={STYLES.graceForm}>
      <div className={STYLES.graceField}>
        <label htmlFor={INPUT_ID} className={STYLES.term}>
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
          className={STYLES.graceInput}
        />
      </div>
      <button type="submit" className={STYLES.confirmButton} disabled={pending}>
        {pending ? copy.saving : copy.grace.save}
      </button>
      <div role="status" aria-live="polite" className={feedback?.kind === 'error' ? STYLES.feedbackError : STYLES.feedback}>
        {feedback?.text ?? null}
      </div>
    </form>
  )
}
