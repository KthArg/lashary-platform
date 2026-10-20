import { ok, isErr, isOk, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { hasExhaustedRetries, type ReminderSnapshot } from '../domain/reminder'
import { buildReminderMessage } from '../domain/reminder-message'
import type { ClientContactPort, NotificationChannel, ReminderRepository, RepositoryFailure } from './ports'

export type SendDueRemindersDeps = {
  listDuePending: ReminderRepository['listDuePending']
  getContact: ClientContactPort['getContact']
  markSent: ReminderRepository['markSent']
  markRetry: ReminderRepository['markRetry']
  markExhausted: ReminderRepository['markExhausted']
  // Primario por ADR-0006 (WhatsApp vía Twilio); respaldo si falla (email vía Resend).
  primaryChannel: NotificationChannel
  backupChannel: NotificationChannel
  clock: Clock
}

export type SendDueRemindersSummary = { sent: number; retried: number; exhausted: number }

const sendOne = async (
  deps: SendDueRemindersDeps,
  reminder: ReminderSnapshot,
  now: Date,
): Promise<Result<'sent' | 'retried' | 'exhausted', RepositoryFailure>> => {
  const contact = await deps.getContact(reminder.clientId)
  if (isErr(contact)) return contact
  if (contact.value === null) {
    return registerFailure(deps, reminder, 'sin contacto registrado para la clienta')
  }

  const message = buildReminderMessage({ techniqueName: reminder.techniqueName, startsAt: reminder.startsAt })

  const primary = await deps.primaryChannel.send({ contact: contact.value, message })
  if (isOk(primary)) {
    const marked = await deps.markSent(reminder.id, deps.primaryChannel.kind, now)
    if (isErr(marked)) return marked
    return ok('sent')
  }

  const backup = await deps.backupChannel.send({ contact: contact.value, message })
  if (isOk(backup)) {
    const marked = await deps.markSent(reminder.id, deps.backupChannel.kind, now)
    if (isErr(marked)) return marked
    return ok('sent')
  }

  return registerFailure(deps, reminder, `${primary.error.message}; ${backup.error.message}`)
}

const registerFailure = async (
  deps: SendDueRemindersDeps,
  reminder: ReminderSnapshot,
  error: string,
): Promise<Result<'retried' | 'exhausted', RepositoryFailure>> => {
  // Criterio 4: los envíos fallidos se reintentan y quedan registrados. Tras MAX_REMINDER_ATTEMPTS
  // se deja de reintentar y el recordatorio queda en failed con el motivo.
  const nextAttempts = reminder.attempts + 1
  if (hasExhaustedRetries({ ...reminder, attempts: nextAttempts })) {
    const marked = await deps.markExhausted(reminder.id, nextAttempts, error)
    if (isErr(marked)) return marked
    return ok('exhausted')
  }
  const marked = await deps.markRetry(reminder.id, nextAttempts, error)
  if (isErr(marked)) return marked
  return ok('retried')
}

export const sendDueReminders =
  (deps: SendDueRemindersDeps) =>
  async (): Promise<Result<SendDueRemindersSummary, RepositoryFailure>> => {
    const now = deps.clock()
    const due = await deps.listDuePending(now)
    if (isErr(due)) return due

    const summary: SendDueRemindersSummary = { sent: 0, retried: 0, exhausted: 0 }
    for (const reminder of due.value) {
      const result = await sendOne(deps, reminder, now)
      if (isErr(result)) return result
      if (result.value === 'sent') summary.sent += 1
      else if (result.value === 'retried') summary.retried += 1
      else summary.exhausted += 1
    }

    return ok(summary)
  }
