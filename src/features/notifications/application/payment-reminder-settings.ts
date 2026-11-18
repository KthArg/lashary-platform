import { err, type Result } from '@/shared/result'
import { isValidPaymentReminderFrequencyDays } from '../domain/payment-reminder'
import { invalidPaymentReminderFrequencyDays } from '../domain/errors'
import type { ChangeFrequencyDaysFailure, PaymentReminderSettingsPort, RepositoryFailure } from './ports'

export const loadPaymentReminderFrequencyDays =
  (settings: PaymentReminderSettingsPort) => (): Promise<Result<number, RepositoryFailure>> =>
    settings.frequencyDays()

export const changePaymentReminderFrequencyDays =
  (settings: PaymentReminderSettingsPort) =>
  async (days: number): Promise<Result<number, ChangeFrequencyDaysFailure>> => {
    if (!isValidPaymentReminderFrequencyDays(days)) return err(invalidPaymentReminderFrequencyDays())
    return settings.setFrequencyDays(days)
  }
