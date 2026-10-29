import { ok, err, type Result } from '@/shared/result'
import { addHours } from '@/shared/date-math'
import { reminderValidationError, type ReminderValidationError } from './errors'

export const REMINDER_WINDOW_HOURS = 24
export const MAX_REMINDER_ATTEMPTS = 5

export type ReminderStatus = 'pending' | 'claimed' | 'sent' | 'cancelled' | 'failed'
export type ReminderChannelKind = 'whatsapp' | 'email'

export type ReminderInput = {
  appointmentId: string
  clientId: string
  startsAt: Date
  techniqueName: string
  createdAt: Date
}

export type ReminderSnapshot = {
  id: string
  appointmentId: string
  clientId: string
  startsAt: Date
  techniqueName: string
  sendAt: Date
  status: ReminderStatus
  attempts: number
  lastError: string | null
  lastChannel: ReminderChannelKind | null
  sentAt: Date | null
}

const reminderBrand: unique symbol = Symbol('Reminder')

export interface Reminder {
  readonly [reminderBrand]: true
  readonly id: string
  readonly appointmentId: string
  readonly clientId: string
  readonly startsAt: Date
  readonly techniqueName: string
  readonly sendAt: Date
  readonly status: ReminderStatus
  readonly attempts: number
  readonly lastError: string | null
  readonly lastChannel: ReminderChannelKind | null
  readonly sentAt: Date | null
}

export function computeReminderSendAt(startsAt: Date): Date {
  return addHours(startsAt, -REMINDER_WINDOW_HOURS)
}

export function buildReminder(id: string, input: ReminderInput): Result<Reminder, ReminderValidationError> {
  const problems: string[] = []

  const appointmentId = input.appointmentId.trim()
  if (appointmentId.length === 0) problems.push('la cita no puede estar vacía')

  const clientId = input.clientId.trim()
  if (clientId.length === 0) problems.push('el cliente no puede estar vacío')

  const techniqueName = input.techniqueName.trim()
  if (techniqueName.length === 0) problems.push('la técnica no puede estar vacía')

  if (input.startsAt.getTime() <= input.createdAt.getTime()) {
    problems.push('la cita debe empezar después del momento en que se programa el recordatorio')
  }

  if (problems.length > 0) return err(reminderValidationError(problems))

  return ok({
    [reminderBrand]: true,
    id,
    appointmentId,
    clientId,
    startsAt: input.startsAt,
    techniqueName,
    sendAt: computeReminderSendAt(input.startsAt),
    status: 'pending',
    attempts: 0,
    lastError: null,
    lastChannel: null,
    sentAt: null,
  })
}

export function reminderToSnapshot(reminder: Reminder): ReminderSnapshot {
  const { [reminderBrand]: _brand, ...snapshot } = reminder
  return snapshot
}

export function hasAppointmentAlreadyStarted(appointment: { startsAt: Date }, now: Date): boolean {
  return appointment.startsAt.getTime() <= now.getTime()
}

export function hasExhaustedRetries(reminder: ReminderSnapshot): boolean {
  return reminder.attempts >= MAX_REMINDER_ATTEMPTS
}
