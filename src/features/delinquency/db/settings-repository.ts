import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import { delinquencyStorageFailed, invalidGraceDays } from '../domain/errors'
import type { SettingsRepository } from '../application/ports'
import { UNEXPECTED_ROW } from './case-row'

export const SETTINGS_TABLE = 'delinquency_settings'
export const SET_GRACE_DAYS_FUNCTION = 'delinquency_set_grace_days'

const PG_INVALID_PARAMETER = '22023'

const settingsRowSchema = z.object({ grace_days: z.number().int() })
const graceDaysSchema = z.number().int()

export function settingsRepository(db: SupabaseClient): SettingsRepository {
  return {
    async graceDays() {
      const { data, error } = await db.from(SETTINGS_TABLE).select('grace_days').single()
      if (error) return err(delinquencyStorageFailed(error.message))
      const parsed = settingsRowSchema.safeParse(data)
      if (!parsed.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))
      return ok(parsed.data.grace_days)
    },

    async setGraceDays(days) {
      const { data, error } = await db.rpc(SET_GRACE_DAYS_FUNCTION, { p_days: days })
      if (error) {
        if (error.code === PG_INVALID_PARAMETER) return err(invalidGraceDays())
        return err(delinquencyStorageFailed(error.message))
      }
      const parsed = graceDaysSchema.safeParse(data)
      if (!parsed.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))
      return ok(parsed.data)
    },
  }
}
