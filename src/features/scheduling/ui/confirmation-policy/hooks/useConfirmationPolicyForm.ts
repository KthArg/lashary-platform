import { useActionState } from 'react'
import { changeConfirmationDeadlineAction } from '../actions/confirmation-policy-actions'
import { initialConfirmationPolicyActionState } from '../types/confirmation-policy.types'

export function useConfirmationPolicyForm() {
  const [state, formAction, pending] = useActionState(
    changeConfirmationDeadlineAction,
    initialConfirmationPolicyActionState,
  )
  return { state, formAction, pending }
}
