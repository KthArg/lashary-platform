import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import { storageFailed } from '../domain/errors'
import type { CancellationPolicyRepository } from '../application/ports'
import {
  CANCELLATION_POLICY_TABLE,
  CANCELLATION_WINDOW_COLUMN,
  POLICY_NOT_FOUND,
  POLICY_SINGLETON_COLUMN,
} from './cancellation-policy-repository.constants'

type PolicyRow = { cancellation_window_hours: number }

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

    async setWindowHours(hours) {
      const { data, error } = await db
        .from(CANCELLATION_POLICY_TABLE)
        .update({ [CANCELLATION_WINDOW_COLUMN]: hours })
        .eq(POLICY_SINGLETON_COLUMN, true)
        .select(CANCELLATION_WINDOW_COLUMN)

      if (error) return err(storageFailed(error.message))
      if (!data || data.length === 0) return err(storageFailed(POLICY_NOT_FOUND))
      return ok(undefined)
    },
  }
}
