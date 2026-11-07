'use server'

import { revalidatePath } from 'next/cache'
import { CONFIRMATION_POLICY_PATH } from '../constants/confirmation-policy-strings'
import { confirmationPolicyService } from '../services/confirmation-policy-service'
import type { ConfirmationPolicyActionState } from '../types/confirmation-policy.types'

export async function changeConfirmationDeadlineAction(
  _previous: ConfirmationPolicyActionState,
  formData: FormData,
): Promise<ConfirmationPolicyActionState> {
  const result = await confirmationPolicyService.change(Object.fromEntries(formData))
  if (result.status === 'ok') revalidatePath(CONFIRMATION_POLICY_PATH)
  return result
}
