import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { changeConfirmationDeadline, getConfirmationDeadline } from '@/features/scheduling/application/confirm-appointment'
import { createSupabaseConfirmationPolicyRepository } from '@/features/scheduling/db/appointment-confirmation-repository'
import { loadConfirmationPolicy } from '../utils/load-confirmation-policy'
import { performChangeConfirmationDeadline } from '../utils/perform-change-deadline'
import type { ConfirmationPolicyActionState, ConfirmationPolicyScreen } from '../types/confirmation-policy.types'

export const confirmationPolicyService = {
  async load(): Promise<ConfirmationPolicyScreen> {
    await requireAdminSession()
    const policy = createSupabaseConfirmationPolicyRepository(await createClient())
    return loadConfirmationPolicy({ getDeadlineHours: getConfirmationDeadline(policy) })
  },

  async change(rawFields: Record<string, unknown>): Promise<ConfirmationPolicyActionState> {
    await requireAdminSession()
    const policy = createSupabaseConfirmationPolicyRepository(await createClient())
    return performChangeConfirmationDeadline(rawFields, {
      change: changeConfirmationDeadline(policy),
    })
  },
}
