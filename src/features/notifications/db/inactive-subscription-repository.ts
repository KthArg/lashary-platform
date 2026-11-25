import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '@/shared/result'
import type { InactiveSubscriptionRepository, RepositoryFailure } from '../application/ports'

export const UNSUBSCRIBE_INACTIVE_FUNCTION = 'notifications_unsubscribe_inactive'
export const RESUBSCRIBE_INACTIVE_FUNCTION = 'notifications_resubscribe_inactive'
const FAILED: RepositoryFailure = 'repository-failed'

export function inactiveSubscriptionRepository(db: SupabaseClient): InactiveSubscriptionRepository {
  const call = async (name: string, token: string) => {
    const { error } = await db.rpc(name, { p_token: token })
    return error ? err(FAILED) : ok(undefined)
  }

  return {
    unsubscribe: (token) => call(UNSUBSCRIBE_INACTIVE_FUNCTION, token),
    resubscribe: (token) => call(RESUBSCRIBE_INACTIVE_FUNCTION, token),
  }
}
