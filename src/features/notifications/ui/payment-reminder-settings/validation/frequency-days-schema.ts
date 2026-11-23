import { z } from 'zod'
import { PAYMENT_REMINDER_FREQUENCY_DAYS_MAX, PAYMENT_REMINDER_FREQUENCY_DAYS_MIN } from '@/features/notifications/domain/payment-reminder'

export const frequencyDaysSchema = z.object({
  frequencyDays: z.number().int().min(PAYMENT_REMINDER_FREQUENCY_DAYS_MIN).max(PAYMENT_REMINDER_FREQUENCY_DAYS_MAX),
})
