import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import { invalidPaymentReminderFrequencyDays } from '../domain/errors'
import type { PaymentReminderSettingsPort } from '../application/ports'

export const PAYMENT_REMINDER_SETTINGS_TABLE = 'notifications_payment_reminder_settings'
export const SET_FREQUENCY_DAYS_FUNCTION = 'notifications_set_payment_reminder_frequency_days'

const PG_INVALID_PARAMETER = '22023'

const FAILED = 'repository-failed' as const

const settingsRowSchema = z.object({ frequency_days: z.number().int() })
const frequencyDaysSchema = z.number().int()

export function paymentReminderSettingsRepository(db: SupabaseClient): PaymentReminderSettingsPort {
  return {
    async frequencyDays() {
      const { data, error } = await db.from(PAYMENT_REMINDER_SETTINGS_TABLE).select('frequency_days').single()
      if (error) return err(FAILED)

      const parsed = settingsRowSchema.safeParse(data)
      if (!parsed.success) return err(FAILED)

      return ok(parsed.data.frequency_days)
    },

    async setFrequencyDays(days) {
      const { data, error } = await db.rpc(SET_FREQUENCY_DAYS_FUNCTION, { p_days: days })
      if (error) {
        if (error.code === PG_INVALID_PARAMETER) return err(invalidPaymentReminderFrequencyDays())
        return err(FAILED)
      }

      const parsed = frequencyDaysSchema.safeParse(data)
      if (!parsed.success) return err(FAILED)

      return ok(parsed.data)
    },
  }
}
