'use server'

import { revalidatePath } from 'next/cache'
import { RESCHEDULE_POLICY_PATH } from '../constants/reschedule-policy-strings'
import { reschedulePolicyService } from '../services/reschedule-policy-service'
import type { ReschedulePolicyActionState } from '../types/reschedule-policy.types'

export async function changeRescheduleLimitAction(
  _previous: ReschedulePolicyActionState,
  formData: FormData,
): Promise<ReschedulePolicyActionState> {
  const result = await reschedulePolicyService.change(Object.fromEntries(formData))
  if (result.status === 'ok') revalidatePath(RESCHEDULE_POLICY_PATH)
  return result
}
