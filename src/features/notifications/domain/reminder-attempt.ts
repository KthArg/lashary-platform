import type { ReminderChannelKind } from './reminder'

export const REMINDER_ATTEMPT_OUTCOMES = {
  sent: 'sent',
  failed: 'failed',
  notConfigured: 'not_configured',
  noContact: 'no_contact',
} as const

type ReminderAttemptContext = {
  reminderId: string
  attemptNumber: number
  attemptedAt: Date
}

type SentAttempt = {
  channel: ReminderChannelKind
  outcome: typeof REMINDER_ATTEMPT_OUTCOMES.sent
  error: null
}

type ChannelFailureAttempt = {
  channel: ReminderChannelKind
  outcome: typeof REMINDER_ATTEMPT_OUTCOMES.failed | typeof REMINDER_ATTEMPT_OUTCOMES.notConfigured
  error: string
}

type NoContactAttempt = {
  channel: null
  outcome: typeof REMINDER_ATTEMPT_OUTCOMES.noContact
  error: string
}

export type ReminderAttempt = ReminderAttemptContext & (SentAttempt | ChannelFailureAttempt | NoContactAttempt)
