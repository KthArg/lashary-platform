import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { loadPaymentReminderFrequencyDays } from '@/features/notifications/application/payment-reminder-settings'
import { paymentReminderSettingsRepository } from '@/features/notifications/db/payment-reminder-settings-repository'
import type { PaymentReminderSettingsScreen } from '../types/payment-reminder-settings.types'

export const paymentReminderSettingsService = {
  async load(): Promise<PaymentReminderSettingsScreen> {
    await requireAdminSession()
    const result = await loadPaymentReminderFrequencyDays(paymentReminderSettingsRepository(await createClient()))()
    if (isErr(result)) return { status: 'error' }
    return { status: 'ready', frequencyDays: result.value }
  },
}
