'use client'

import { MAX_CANCELLATION_WINDOW_HOURS, MIN_CANCELLATION_WINDOW_HOURS } from '../../../../domain/cancellation-window.constants'
import {
  CANCELLATION_WINDOW_FIELD,
  CANCELLATION_WINDOW_HINT_ID,
  cancellationPolicyMessages,
} from '../../constants/cancellation-policy-strings'
import { useCancellationPolicyForm } from '../../hooks/useCancellationPolicyForm'
import { cancellationPolicyFormStyles as STYLES } from './CancellationPolicyForm.styles'
import type { CancellationPolicyFormProps } from './CancellationPolicyForm.types'

export function CancellationPolicyForm({ hours }: CancellationPolicyFormProps) {
  const copy = cancellationPolicyMessages
  const { state, formAction, pending } = useCancellationPolicyForm()

  return (
    <>
      <form action={formAction} className={STYLES.form}>
        <label className={STYLES.field}>
          <span className={STYLES.labelText}>{copy.hoursLabel}</span>
          <input
            type="number"
            name={CANCELLATION_WINDOW_FIELD}
            defaultValue={hours}
            min={MIN_CANCELLATION_WINDOW_HOURS}
            max={MAX_CANCELLATION_WINDOW_HOURS}
            step={1}
            inputMode="numeric"
            required
            aria-describedby={CANCELLATION_WINDOW_HINT_ID}
            className={STYLES.input}
          />
        </label>
        <button type="submit" disabled={pending} className={STYLES.submit}>
          {pending ? copy.saving : copy.submit}
        </button>
      </form>
      <p id={CANCELLATION_WINDOW_HINT_ID} className={STYLES.hint}>
        {copy.hoursHint(hours)}
      </p>
      {state.status === 'ok' && (
        <div role="status" className={STYLES.alertSuccess}>
          <span>{state.message}</span>
        </div>
      )}
      {state.status === 'warning' && (
        <div role="alert" className={STYLES.alertWarning}>
          <span>{state.message}</span>
        </div>
      )}
      {(state.status === 'invalid' || state.status === 'failed' || state.status === 'forbidden') && (
        <div role="alert" className={STYLES.alertError}>
          <span>{state.message}</span>
        </div>
      )}
    </>
  )
}
