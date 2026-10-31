import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import { invalidRescheduleLimit, storageFailed } from '../domain/errors'
import { NO_ROW_RETURNED } from './booking-repository.constants'
import type { ReschedulePolicyRepository } from '../application/ports'
import {
  CHANGE_RESCHEDULE_LIMIT_FUNCTION,
  INVALID_RESCHEDULE_LIMIT_MESSAGE,
  MAX_RESCHEDULES_COLUMN,
  RESCHEDULE_POLICY_NOT_FOUND,
  RESCHEDULE_POLICY_SINGLETON_COLUMN,
  RESCHEDULE_POLICY_TABLE,
} from './reschedule-policy-repository.constants'

type PolicyRow = { max_reschedules: number }
type ChangeRow = { previous_max: number; new_max: number }

export function createSupabaseReschedulePolicyRepository(db: SupabaseClient): ReschedulePolicyRepository {
  return {
    async getMaxReschedules() {
      const { data, error } = await db
        .from(RESCHEDULE_POLICY_TABLE)
        .select(MAX_RESCHEDULES_COLUMN)
        .eq(RESCHEDULE_POLICY_SINGLETON_COLUMN, true)
        .maybeSingle()

      if (error) return err(storageFailed(error.message))
      if (!data) return err(storageFailed(RESCHEDULE_POLICY_NOT_FOUND))
      return ok(Number((data as PolicyRow).max_reschedules))
    },

    async changeMaxReschedules(max) {
      const { data, error } = await db.rpc(CHANGE_RESCHEDULE_LIMIT_FUNCTION, { p_max: max })

      if (error) {
        return err(
          error.message === INVALID_RESCHEDULE_LIMIT_MESSAGE ? invalidRescheduleLimit(max) : storageFailed(error.message),
        )
      }
      const [row] = (data ?? []) as ChangeRow[]
      if (!row) return err(storageFailed(NO_ROW_RETURNED))
      return ok({ previousMax: Number(row.previous_max), newMax: Number(row.new_max) })
    },
  }
}
