'use client'

import { useActionState } from 'react'
import { queueInactiveRemindersAction } from '../../actions/inactive-send-actions'
import { inactiveSendMessages as copy } from '../../constants/inactive-send-strings'
import { InactiveClientsTable } from '../InactiveClientsTable'
import { inactiveRemindersFormStyles as STYLES } from './InactiveRemindersForm.styles'
import type { InactiveRemindersFormProps } from './InactiveRemindersForm.types'
import type { QueueActionState } from '../../types/inactive-send.types'

const IDLE: QueueActionState = { status: 'idle' }

export function InactiveRemindersForm({ clients }: InactiveRemindersFormProps) {
  const [state, formAction, pending] = useActionState(queueInactiveRemindersAction, IDLE)

  return (
    <form action={formAction} className={STYLES.form}>
      <div role="status" aria-live="polite" className={STYLES.feedback}>
        {state.status !== 'idle' && (
          <p className={state.status === 'success' ? STYLES.success : STYLES.error}>{state.message}</p>
        )}
      </div>
      <InactiveClientsTable clients={clients} selection={{ pending }} />
      <div className={STYLES.actions}>
        <button type="submit" disabled={pending} className={STYLES.sendSelected}>
          {pending ? copy.sending : copy.sendSelected}
        </button>
        <p className={STYLES.hint}>{copy.hint}</p>
      </div>
    </form>
  )
}
