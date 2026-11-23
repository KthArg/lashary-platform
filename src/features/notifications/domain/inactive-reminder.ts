import { addDays } from '@/shared/date-math'
import { err, ok, type Result } from '@/shared/result'
import { inactiveQueueEmpty, inactiveQueueTooMany, type InactiveQueueEmpty, type InactiveQueueTooMany } from './errors'

export const INACTIVE_RANGE_DAYS = [30, 60, 90, 180] as const
export type InactiveRangeDays = (typeof INACTIVE_RANGE_DAYS)[number]
export const INACTIVE_RANGE_DEFAULT_DAYS: InactiveRangeDays = 90

export const INACTIVE_REMINDER_MAX_CLIENTS_PER_SEND = 50
export const INACTIVE_REMINDER_MIN_DAYS_BETWEEN = 30

export const INACTIVE_REMINDER_STATUSES = ['pending', 'claimed', 'sent', 'failed'] as const
export type InactiveReminderStatus = (typeof INACTIVE_REMINDER_STATUSES)[number]

export type InactiveClientLastReminder = {
  status: InactiveReminderStatus
  queuedAt: Date
  sentAt: Date | null
}

export type InactiveClient = {
  clientId: string
  fullName: string
  lastVisitAt: Date | null
  optedOut: boolean
  lastReminder: InactiveClientLastReminder | null
}

export type InactiveQueueOutcome = {
  queued: number
  alreadyQueued: number
  optedOut: number
  recent: number
  unknown: number
}

const DIGITS_ONLY = /^\d+$/

export const isInactiveRangeDays = (value: unknown): value is InactiveRangeDays =>
  INACTIVE_RANGE_DAYS.some((days) => days === value)

export function readInactiveRangeDays(raw: unknown): InactiveRangeDays {
  const days = typeof raw === 'string' && DIGITS_ONLY.test(raw) ? Number(raw) : raw
  return isInactiveRangeDays(days) ? days : INACTIVE_RANGE_DEFAULT_DAYS
}

export function inactiveSince(now: Date, rangeDays: InactiveRangeDays): Date {
  return addDays(now, -rangeDays)
}

export const isReminderQueued = (reminder: InactiveClientLastReminder | null): boolean =>
  reminder !== null && (reminder.status === 'pending' || reminder.status === 'claimed')

export const canQueueInactiveReminder = (client: InactiveClient): boolean =>
  !client.optedOut && !isReminderQueued(client.lastReminder)

export function validateInactiveQueueRequest(
  clientIds: readonly string[],
  maxClients: number = INACTIVE_REMINDER_MAX_CLIENTS_PER_SEND,
): Result<string[], InactiveQueueEmpty | InactiveQueueTooMany> {
  const unique = [...new Set(clientIds.map((id) => id.trim()).filter((id) => id.length > 0))]
  if (unique.length === 0) return err(inactiveQueueEmpty())
  if (unique.length > maxClients) return err(inactiveQueueTooMany(maxClients))
  return ok(unique)
}
