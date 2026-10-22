import { useActionState } from 'react'
import { changeCancellationWindowAction } from '../actions/cancellation-policy-actions'
import { initialCancellationPolicyActionState } from '../types/cancellation-policy.types'

export function useCancellationPolicyForm() {
  const [state, formAction, pending] = useActionState(
    changeCancellationWindowAction,
    initialCancellationPolicyActionState,
  )
  return { state, formAction, pending }
}
