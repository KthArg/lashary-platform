import { ok, isErr, isOk, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { hasExhaustedRetries, type ReminderSnapshot } from '../domain/reminder'
import { buildReminderMessage, buildReminderTemplateVariables } from '../domain/reminder-message'
import { isChannelNotConfigured } from '../domain/errors'
import type { ClientContactPort, NotificationChannel, ReminderRepository, RepositoryFailure } from './ports'

const MAX_LAST_ERROR_LENGTH = 500

export type SendDueRemindersDeps = {
  claimDuePending: ReminderRepository['claimDuePending']
  getContact: ClientContactPort['getContact']
  markSent: ReminderRepository['markSent']
  markRetry: ReminderRepository['markRetry']
  markExhausted: ReminderRepository['markExhausted']
  primaryChannel: NotificationChannel
  backupChannel: NotificationChannel
  clock: Clock
}

export type SendDueRemindersSummary = { sent: number; retried: number; exhausted: number; errored: number }

type SendOutcome = 'sent' | 'retried' | 'exhausted' | 'errored'

const truncateLastError = (error: string): string =>
  error.length > MAX_LAST_ERROR_LENGTH ? `${error.slice(0, MAX_LAST_ERROR_LENGTH)}…` : error

const registerFailure = async (
  deps: SendDueRemindersDeps,
  reminder: ReminderSnapshot,
  error: string,
  isPermanent: boolean,
): Promise<Result<'retried' | 'exhausted', RepositoryFailure>> => {
  const nextAttempts = reminder.attempts + 1
  const truncatedError = truncateLastError(error)
  if (isPermanent || hasExhaustedRetries({ ...reminder, attempts: nextAttempts })) {
    const marked = await deps.markExhausted(reminder.id, nextAttempts, truncatedError)
    if (isErr(marked)) return marked
    return ok('exhausted')
  }
  const marked = await deps.markRetry(reminder.id, nextAttempts, truncatedError)
  if (isErr(marked)) return marked
  return ok('retried')
}

const sendOne = async (deps: SendDueRemindersDeps, reminder: ReminderSnapshot, now: Date): Promise<SendOutcome> => {
  const contact = await deps.getContact(reminder.clientId)
  if (isErr(contact)) {
    console.error(`[notifications] no se pudo leer el contacto de ${reminder.clientId} para el recordatorio ${reminder.id}: ${contact.error}`)
    return 'errored'
  }
  if (contact.value === null) {
    const registered = await registerFailure(deps, reminder, 'sin contacto registrado para la clienta', false)
    if (isErr(registered)) { console.error(`[notifications] no se pudo registrar el fallo de contacto del recordatorio ${reminder.id}: ${registered.error}`); return 'errored' }
    return registered.value
  }

  const reminderMessageInput = { techniqueName: reminder.techniqueName, startsAt: reminder.startsAt }
  const message = buildReminderMessage(reminderMessageInput)
  const templateVariables = buildReminderTemplateVariables(reminderMessageInput)

  const primary = await deps.primaryChannel.send({ reminderId: reminder.id, contact: contact.value, message, templateVariables })
  if (isOk(primary)) {
    const marked = await deps.markSent(reminder.id, deps.primaryChannel.kind, now)
    if (isErr(marked)) { console.error(`[notifications] se mandó el recordatorio ${reminder.id} por ${deps.primaryChannel.kind} pero no se pudo marcar sent: ${marked.error}`); return 'errored' }
    return 'sent'
  }

  const backup = await deps.backupChannel.send({ reminderId: reminder.id, contact: contact.value, message, templateVariables })
  if (isOk(backup)) {
    const marked = await deps.markSent(reminder.id, deps.backupChannel.kind, now)
    if (isErr(marked)) { console.error(`[notifications] se mandó el recordatorio ${reminder.id} por ${deps.backupChannel.kind} pero no se pudo marcar sent: ${marked.error}`); return 'errored' }
    return 'sent'
  }

  const bothChannelsUnconfigured = isChannelNotConfigured(primary.error) && isChannelNotConfigured(backup.error)
  const registered = await registerFailure(deps, reminder, `${primary.error.message}; ${backup.error.message}`, bothChannelsUnconfigured)
  if (isErr(registered)) { console.error(`[notifications] no se pudo registrar el fallo de envío del recordatorio ${reminder.id}: ${registered.error}`); return 'errored' }
  return registered.value
}

export const sendDueReminders =
  (deps: SendDueRemindersDeps) =>
  async (): Promise<Result<SendDueRemindersSummary, RepositoryFailure>> => {
    const now = deps.clock()
    const due = await deps.claimDuePending(now)
    if (isErr(due)) return due

    const summary: SendDueRemindersSummary = { sent: 0, retried: 0, exhausted: 0, errored: 0 }
    for (const reminder of due.value) {
      const outcome = await sendOne(deps, reminder, now)
      summary[outcome] += 1
    }

    return ok(summary)
  }
