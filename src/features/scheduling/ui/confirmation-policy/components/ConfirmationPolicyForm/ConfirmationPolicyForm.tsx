'use client'

import { MAX_CONFIRMATION_DEADLINE_HOURS, MIN_CONFIRMATION_DEADLINE_HOURS } from '@/features/scheduling/domain/appointment-confirmation.constants'
import {
  CONFIRMATION_DEADLINE_FIELD,
  CONFIRMATION_DEADLINE_HINT_ID,
  confirmationPolicyMessages,
} from '../../constants/confirmation-policy-strings'
import { useConfirmationPolicyForm } from '../../hooks/useConfirmationPolicyForm'
import { confirmationPolicyFormStyles as STYLES } from './ConfirmationPolicyForm.styles'
import type { ConfirmationPolicyFormProps } from './ConfirmationPolicyForm.types'

export function ConfirmationPolicyForm({ hours }: ConfirmationPolicyFormProps) {
  const copy = confirmationPolicyMessages
  const { state, formAction, pending } = useConfirmationPolicyForm()

  return (
    <>
      <form action={formAction} className={STYLES.form}>
        <label className={STYLES.field}>
          <span className={STYLES.labelText}>{copy.hoursLabel}</span>
          <input
            type="number"
            name={CONFIRMATION_DEADLINE_FIELD}
            defaultValue={hours}
            min={MIN_CONFIRMATION_DEADLINE_HOURS}
            max={MAX_CONFIRMATION_DEADLINE_HOURS}
            step={1}
            inputMode="numeric"
            required
            aria-describedby={CONFIRMATION_DEADLINE_HINT_ID}
            className={STYLES.input}
          />
        </label>
        <button type="submit" disabled={pending} className={STYLES.submit}>
          {pending ? copy.saving : copy.submit}
        </button>
      </form>
      <p id={CONFIRMATION_DEADLINE_HINT_ID} className={STYLES.hint}>
        {copy.hoursHint(hours)}
      </p>
      {state.status === 'ok' && (
        <div role="status" className={STYLES.alertSuccess}>
          <span>{state.message}</span>
        </div>
      )}
      {(state.status === 'invalid' || state.status === 'failed') && (
        <div role="alert" className={STYLES.alertError}>
          <span>{state.message}</span>
        </div>
      )}
    </>
  )
}
