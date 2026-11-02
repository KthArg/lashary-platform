'use client'

import { MAX_RESCHEDULE_LIMIT, MIN_RESCHEDULE_LIMIT } from '../../../domain/reschedule-limit.constants'
import {
  RESCHEDULE_LIMIT_FIELD,
  RESCHEDULE_LIMIT_HINT_ID,
  reschedulePolicyMessages,
} from '../constants/reschedule-policy-strings'
import { useReschedulePolicyForm } from '../hooks/useReschedulePolicyForm'
import { reschedulePolicyStyles as STYLES } from '../styles/reschedule-policy.styles'

export function ReschedulePolicyForm({ max }: { max: number }) {
  const copy = reschedulePolicyMessages
  const { state, formAction, pending } = useReschedulePolicyForm()

  return (
    <>
      <form action={formAction} className={STYLES.form}>
        <label className={STYLES.field}>
          <span className={STYLES.labelText}>{copy.limitLabel}</span>
          <input
            type="number"
            name={RESCHEDULE_LIMIT_FIELD}
            defaultValue={max}
            min={MIN_RESCHEDULE_LIMIT}
            max={MAX_RESCHEDULE_LIMIT}
            step={1}
            inputMode="numeric"
            required
            aria-describedby={RESCHEDULE_LIMIT_HINT_ID}
            className={STYLES.input}
          />
        </label>
        <button type="submit" disabled={pending} className={STYLES.submit}>
          {pending ? copy.saving : copy.submit}
        </button>
      </form>
      <p id={RESCHEDULE_LIMIT_HINT_ID} className={STYLES.hint}>
        {copy.limitHint(max)}
      </p>
      {state.status === 'ok' && (
        <div role="status" className={STYLES.alertSuccess}>
          <span>{state.message}</span>
        </div>
      )}
      {(state.status === 'invalid' || state.status === 'failed') && (
        <div role="alert" className={STYLES.alertFormError}>
          <span>{state.message}</span>
        </div>
      )}
    </>
  )
}
