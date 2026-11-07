import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import type { DroppedNoticesRepository, RepositoryFailure } from '../application/ports'

export const RECONCILE_DROPPED_NOTICES_FUNCTION = 'notifications_reconcile_dropped_notices'
const FAILED: RepositoryFailure = 'repository-failed'

const reconcileResponseSchema = z.tuple([
  z.object({
    resolved: z.number().int().min(0),
    still_open: z.number().int().min(0),
  }),
])

export function droppedNoticesRepository(db: SupabaseClient): DroppedNoticesRepository {
  return {
    async reconcile() {
      const { data, error } = await db.rpc(RECONCILE_DROPPED_NOTICES_FUNCTION)
      if (error) return err(FAILED)
      const parsed = reconcileResponseSchema.safeParse(data)
      if (!parsed.success) return err(FAILED)
      const [row] = parsed.data
      return ok({ resolved: row.resolved, open: row.still_open })
    },
  }
}
