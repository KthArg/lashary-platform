import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import type { PaymentReminderSettingsPort } from '../application/ports'

export const PAYMENT_REMINDER_SETTINGS_TABLE = 'notifications_payment_reminder_settings'

const FAILED = 'repository-failed' as const

const settingsRowSchema = z.object({ frequency_days: z.number().int() })

export function paymentReminderSettingsRepository(db: SupabaseClient): PaymentReminderSettingsPort {
  return {
    async frequencyDays() {
      const { data, error } = await db.from(PAYMENT_REMINDER_SETTINGS_TABLE).select('frequency_days').single()
      if (error) return err(FAILED)

      const parsed = settingsRowSchema.safeParse(data)
      if (!parsed.success) return err(FAILED)

      return ok(parsed.data.frequency_days)
    },
  }
}
