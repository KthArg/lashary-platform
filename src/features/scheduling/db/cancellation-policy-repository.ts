import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import { invalidCancellationWindow, storageFailed } from '../domain/errors'
import { NO_ROW_RETURNED } from './booking-repository.constants'
import type { CancellationPolicyRepository } from '../application/ports'
import {
  CANCELLATION_POLICY_TABLE,
  CANCELLATION_WINDOW_COLUMN,
  CHANGE_CANCELLATION_WINDOW_FUNCTION,
  INVALID_CANCELLATION_WINDOW_MESSAGE,
  POLICY_NOT_FOUND,
  POLICY_SINGLETON_COLUMN,
} from './cancellation-policy-repository.constants'

type PolicyRow = { cancellation_window_hours: number }
type ChangeRow = { previous_hours: number; new_hours: number }

export function createSupabaseCancellationPolicyRepository(db: SupabaseClient): CancellationPolicyRepository {
  return {
    async getWindowHours() {
      const { data, error } = await db
        .from(CANCELLATION_POLICY_TABLE)
        .select(CANCELLATION_WINDOW_COLUMN)
        .eq(POLICY_SINGLETON_COLUMN, true)
        .maybeSingle()

      if (error) return err(storageFailed(error.message))
      if (!data) return err(storageFailed(POLICY_NOT_FOUND))
      return ok(Number((data as PolicyRow).cancellation_window_hours))
    },

    async changeWindowHours(hours) {
      const { data, error } = await db.rpc(CHANGE_CANCELLATION_WINDOW_FUNCTION, { p_hours: hours })

      if (error) {
        return err(
          error.message === INVALID_CANCELLATION_WINDOW_MESSAGE
            ? invalidCancellationWindow(hours)
            : storageFailed(error.message),
        )
      }
      const [row] = (data ?? []) as ChangeRow[]
      if (!row) return err(storageFailed(NO_ROW_RETURNED))
      return ok({ previousHours: Number(row.previous_hours), newHours: Number(row.new_hours) })
    },
  }
}
