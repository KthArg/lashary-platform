import type { ReminderChannelKind } from './reminder'

export const REMINDER_ATTEMPT_OUTCOMES = {
  sent: 'sent',
  failed: 'failed',
  notConfigured: 'not_configured',
  noContact: 'no_contact',
} as const

export type ReminderAttemptOutcome = (typeof REMINDER_ATTEMPT_OUTCOMES)[keyof typeof REMINDER_ATTEMPT_OUTCOMES]

export type ReminderAttempt = {
  reminderId: string
  attemptNumber: number
  channel: ReminderChannelKind | null
  outcome: ReminderAttemptOutcome
  error: string | null
  attemptedAt: Date
}
