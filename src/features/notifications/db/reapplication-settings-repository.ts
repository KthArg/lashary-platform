import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import { invalidAnticipationDays } from '../domain/errors'
import type { ReapplicationSettingsRepository } from '../application/ports'

export const REAPPLICATION_SETTINGS_TABLE = 'notifications_reapplication_settings'
export const SET_ANTICIPATION_DAYS_FUNCTION = 'notifications_set_reapplication_anticipation_days'

const PG_INVALID_PARAMETER = '22023'
const FAILED = 'repository-failed' as const

const settingsRowSchema = z.object({ anticipation_days: z.number().int() })
const anticipationDaysSchema = z.number().int()

export function reapplicationSettingsRepository(db: SupabaseClient): ReapplicationSettingsRepository {
  return {
    async anticipationDays() {
      const { data, error } = await db.from(REAPPLICATION_SETTINGS_TABLE).select('anticipation_days').single()
      if (error) return err(FAILED)
      const parsed = settingsRowSchema.safeParse(data)
      if (!parsed.success) return err(FAILED)
      return ok(parsed.data.anticipation_days)
    },

    async setAnticipationDays(days) {
      const { data, error } = await db.rpc(SET_ANTICIPATION_DAYS_FUNCTION, { p_days: days })
      if (error) {
        if (error.code === PG_INVALID_PARAMETER) return err(invalidAnticipationDays())
        return err(FAILED)
      }
      const parsed = anticipationDaysSchema.safeParse(data)
      if (!parsed.success) return err(FAILED)
      return ok(parsed.data)
    },
  }
}
