'use client'

import { useState, useTransition, type FormEvent } from 'react'
import type { Feedback } from '../../reapplication-settings/components/FeedbackMessage'
import { setFrequencyDaysAction } from '../actions/payment-reminder-settings-actions'
import { paymentReminderSettingsMessages as copy } from '../constants/payment-reminder-settings-strings'

export function useFrequencyDaysForm(initialFrequencyDays: number) {
  const [value, setValue] = useState(String(initialFrequencyDays))
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<Feedback>(null)

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const result = await setFrequencyDaysAction({ frequencyDays: value.trim() === '' ? Number.NaN : Number(value) })
      if (!result.ok) {
        setFeedback({ kind: 'error', text: result.error })
        return
      }
      setValue(String(result.frequencyDays))
      setFeedback({ kind: 'ok', text: copy.saved })
    })
  }

  return { value, setValue, pending, feedback, save }
}
