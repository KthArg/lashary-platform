import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { changeCancellationWindow, getCancellationWindow } from '../../../application/cancellation-window'
import { createSupabaseCancellationPolicyRepository } from '../../../db/cancellation-policy-repository'
import { loadCancellationPolicy } from '../utils/load-cancellation-policy'
import { performChangeCancellationWindow } from '../utils/perform-change-window'
import type { CancellationPolicyActionState, CancellationPolicyScreen } from '../types/cancellation-policy.types'

export const cancellationPolicyService = {
  async load(): Promise<CancellationPolicyScreen> {
    await requireAdminSession()
    const policy = createSupabaseCancellationPolicyRepository(await createClient())
    return loadCancellationPolicy({ getWindowHours: getCancellationWindow(policy) })
  },

  async change(rawFields: Record<string, unknown>): Promise<CancellationPolicyActionState> {
    await requireAdminSession()
    const policy = createSupabaseCancellationPolicyRepository(await createClient())
    return performChangeCancellationWindow(rawFields, {
      change: changeCancellationWindow(policy),
    })
  },
}
