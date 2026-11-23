'use client'

import { useActionState } from 'react'
import { changeSubscriptionAction } from '../../actions/unsubscribe-actions'
import { UNSUBSCRIBE_FIELDS, UNSUBSCRIBE_INTENTS, unsubscribeMessages as copy } from '../../constants/unsubscribe-strings'
import { unsubscribeFormStyles as STYLES } from './UnsubscribeForm.styles'
import type { UnsubscribeFormProps } from './UnsubscribeForm.types'
import type { SubscriptionState } from '../../types/unsubscribe.types'

const IDLE: SubscriptionState = { status: 'idle' }

const MESSAGES: Record<SubscriptionState['status'], string> = {
  idle: copy.question,
  unsubscribed: copy.unsubscribed,
  subscribed: copy.subscribed,
  invalid: copy.invalid,
  error: copy.error,
}

export function UnsubscribeForm({ token }: UnsubscribeFormProps) {
  const [state, formAction, pending] = useActionState(changeSubscriptionAction, IDLE)
  const isUnsubscribed = state.status === 'unsubscribed'
  const intent = isUnsubscribed ? UNSUBSCRIBE_INTENTS.resubscribe : UNSUBSCRIBE_INTENTS.unsubscribe
  const isProblem = state.status === 'error' || state.status === 'invalid'

  return (
    <form action={formAction} className={STYLES.form}>
      <div role="status" aria-live="polite">
        <p className={isProblem ? STYLES.problem : STYLES.message}>{MESSAGES[state.status]}</p>
      </div>
      <input type="hidden" name={UNSUBSCRIBE_FIELDS.token} value={token} />
      <input type="hidden" name={UNSUBSCRIBE_FIELDS.intent} value={intent} />
      <button type="submit" disabled={pending} className={isUnsubscribed ? STYLES.secondary : STYLES.primary}>
        {pending ? copy.working : isUnsubscribed ? copy.resubscribe : copy.unsubscribe}
      </button>
    </form>
  )
}
