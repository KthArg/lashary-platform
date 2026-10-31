import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import { storageFailed } from '../domain/errors'
import type { RescheduleExpiryRepository } from '../application/ports'
import { EXPIRE_UNDECIDED_RESCHEDULES_FUNCTION } from './reschedule-repository.constants'

export function createSupabaseRescheduleExpiryRepository(db: SupabaseClient): RescheduleExpiryRepository {
  return {
    async expireUndecided() {
      const { data, error } = await db.rpc(EXPIRE_UNDECIDED_RESCHEDULES_FUNCTION)
      if (error) return err(storageFailed(error.message))
      return ok(Number(data ?? 0))
    },
  }
}
