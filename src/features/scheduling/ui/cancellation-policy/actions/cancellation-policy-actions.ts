'use server'

import { revalidatePath } from 'next/cache'
import { CANCELLATION_POLICY_PATH } from '../constants/cancellation-policy-strings'
import { cancellationPolicyService } from '../services/cancellation-policy-service'
import type { CancellationPolicyActionState } from '../types/cancellation-policy.types'

export async function changeCancellationWindowAction(
  _previous: CancellationPolicyActionState,
  formData: FormData,
): Promise<CancellationPolicyActionState> {
  const result = await cancellationPolicyService.change(Object.fromEntries(formData))
  if (result.status === 'ok') revalidatePath(CANCELLATION_POLICY_PATH)
  return result
}
