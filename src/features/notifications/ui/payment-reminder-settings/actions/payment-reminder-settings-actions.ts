'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { changePaymentReminderFrequencyDays } from '@/features/notifications/application/payment-reminder-settings'
import { paymentReminderSettingsRepository } from '@/features/notifications/db/payment-reminder-settings-repository'
import { isInvalidPaymentReminderFrequencyDays } from '@/features/notifications/domain/errors'
import { PAYMENT_REMINDER_FREQUENCY_DAYS_MAX, PAYMENT_REMINDER_FREQUENCY_DAYS_MIN } from '@/features/notifications/domain/payment-reminder'
import { frequencyDaysSchema } from '../validation/frequency-days-schema'
import { paymentReminderSettingsMessages as copy, PAYMENT_REMINDER_SETTINGS_PATH } from '../constants/payment-reminder-settings-strings'
import type { SetFrequencyDaysActionResult } from '../types/payment-reminder-settings.types'

export async function setFrequencyDaysAction(input: unknown): Promise<SetFrequencyDaysActionResult> {
  await requireAdminSession()

  const invalidMessage = copy.invalid(PAYMENT_REMINDER_FREQUENCY_DAYS_MIN, PAYMENT_REMINDER_FREQUENCY_DAYS_MAX)

  const parsed = frequencyDaysSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: invalidMessage }

  const result = await changePaymentReminderFrequencyDays(paymentReminderSettingsRepository(await createClient()))(parsed.data.frequencyDays)
  if (isErr(result)) {
    if (isInvalidPaymentReminderFrequencyDays(result.error)) return { ok: false, error: invalidMessage }
    return { ok: false, error: copy.saveFailed }
  }

  revalidatePath(PAYMENT_REMINDER_SETTINGS_PATH)
  return { ok: true, frequencyDays: result.value }
}
