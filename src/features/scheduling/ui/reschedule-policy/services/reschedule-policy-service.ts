import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { changeRescheduleLimit, getRescheduleLimit } from '../../../application/reschedule-limit'
import { createSupabaseReschedulePolicyRepository } from '../../../db/reschedule-policy-repository'
import { loadReschedulePolicy } from '../utils/load-reschedule-policy'
import { performChangeRescheduleLimit } from '../utils/perform-change-limit'
import type { ReschedulePolicyActionState, ReschedulePolicyScreen } from '../types/reschedule-policy.types'

export const reschedulePolicyService = {
  async load(): Promise<ReschedulePolicyScreen> {
    await requireAdminSession()
    const policy = createSupabaseReschedulePolicyRepository(await createClient())
    return loadReschedulePolicy({ getMaxReschedules: getRescheduleLimit(policy) })
  },

  async change(rawFields: Record<string, unknown>): Promise<ReschedulePolicyActionState> {
    await requireAdminSession()
    const policy = createSupabaseReschedulePolicyRepository(await createClient())
    return performChangeRescheduleLimit(rawFields, { change: changeRescheduleLimit(policy) })
  },
}
