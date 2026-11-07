import { err, ok, type Result } from '@/shared/result'
import {
  CONFIRMABLE_STATUS,
  MAX_CONFIRMATION_DEADLINE_HOURS,
  MIN_CONFIRMATION_DEADLINE_HOURS,
  MS_PER_HOUR,
} from './appointment-confirmation.constants'
import { invalidConfirmationDeadline, type InvalidConfirmationDeadline } from './errors'

export interface ConfirmationCandidate {
  readonly status: string
  readonly clientId: string | null
  readonly startsAtMs: number
}

export function checkConfirmationDeadlineHours(hours: number): Result<number, InvalidConfirmationDeadline> {
  const isWholeNumberInRange =
    Number.isInteger(hours) && hours >= MIN_CONFIRMATION_DEADLINE_HOURS && hours <= MAX_CONFIRMATION_DEADLINE_HOURS
  return isWholeNumberInRange ? ok(hours) : err(invalidConfirmationDeadline(hours))
}

export function isConfirmationOverdue(
  appointment: ConfirmationCandidate,
  deadlineHours: number,
  nowMs: number,
): boolean {
  if (appointment.status !== CONFIRMABLE_STATUS || appointment.clientId === null) return false
  const msUntilStart = appointment.startsAtMs - nowMs
  return msUntilStart > 0 && msUntilStart <= deadlineHours * MS_PER_HOUR
}
