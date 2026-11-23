'use client'

import { PAYMENT_REMINDER_FREQUENCY_DAYS_MAX, PAYMENT_REMINDER_FREQUENCY_DAYS_MIN } from '@/features/notifications/domain/payment-reminder'
import { paymentReminderSettingsMessages as copy } from '../../constants/payment-reminder-settings-strings'
import { useFrequencyDaysForm } from '../../hooks/use-frequency-days-form'
import { FeedbackMessage } from '@/features/notifications/ui/reapplication-settings/components/FeedbackMessage'
import { frequencyDaysFormStyles as STYLES } from './FrequencyDaysForm.styles'
import type { FrequencyDaysFormProps } from './FrequencyDaysForm.types'

const INPUT_ID = 'notifications-payment-reminder-frequency-days'

export function FrequencyDaysForm({ frequencyDays }: FrequencyDaysFormProps) {
  const { value, setValue, pending, feedback, save } = useFrequencyDaysForm(frequencyDays)

  return (
    <form onSubmit={save} className={STYLES.form}>
      <div className={STYLES.field}>
        <label htmlFor={INPUT_ID} className={STYLES.label}>
          {copy.label(PAYMENT_REMINDER_FREQUENCY_DAYS_MIN, PAYMENT_REMINDER_FREQUENCY_DAYS_MAX)}
        </label>
        <input
          id={INPUT_ID}
          type="number"
          inputMode="numeric"
          min={PAYMENT_REMINDER_FREQUENCY_DAYS_MIN}
          max={PAYMENT_REMINDER_FREQUENCY_DAYS_MAX}
          step={1}
          value={value}
          disabled={pending}
          onChange={(event) => setValue(event.target.value)}
          className={STYLES.input}
        />
      </div>
      <button type="submit" className={STYLES.saveButton} disabled={pending}>
        {pending ? copy.saving : copy.save}
      </button>
      <FeedbackMessage feedback={feedback} />
    </form>
  )
}
