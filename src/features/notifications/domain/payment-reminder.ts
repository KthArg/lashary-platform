import { addDays } from '@/shared/date-math'

export const PAYMENT_REMINDER_FREQUENCY_DAYS_MIN = 1
export const PAYMENT_REMINDER_FREQUENCY_DAYS_MAX = 30
export const PAYMENT_REMINDER_FREQUENCY_DAYS_DEFAULT = 7

export const isValidPaymentReminderFrequencyDays = (days: unknown): days is number =>
  typeof days === 'number' &&
  Number.isInteger(days) &&
  days >= PAYMENT_REMINDER_FREQUENCY_DAYS_MIN &&
  days <= PAYMENT_REMINDER_FREQUENCY_DAYS_MAX

export function isPaymentReminderDue(lastSentAt: Date | null, frequencyDays: number, now: Date): boolean {
  if (lastSentAt === null) return true
  return addDays(lastSentAt, frequencyDays).getTime() <= now.getTime()
}
