import { useActionState } from 'react'
import { changeRescheduleLimitAction } from '../actions/reschedule-policy-actions'
import { initialReschedulePolicyActionState } from '../types/reschedule-policy.types'

export function useReschedulePolicyForm() {
  const [state, formAction, pending] = useActionState(
    changeRescheduleLimitAction,
    initialReschedulePolicyActionState,
  )
  return { state, formAction, pending }
}
