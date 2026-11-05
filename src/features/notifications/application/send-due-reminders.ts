import { ok, isErr, isOk, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { hasExhaustedRetries, type ReminderSnapshot } from '../domain/reminder'
import { buildReminderMessage, buildReminderTemplateVariables } from '../domain/reminder-message'
import { REMINDER_ATTEMPT_OUTCOMES, type ReminderAttempt } from '../domain/reminder-attempt'
import { sanitizeProviderError } from '../domain/provider-error'
import { isChannelNotConfigured, type ChannelNotConfigured, type ChannelSendFailed } from '../domain/errors'
import type { ClientContactPort, MessagePurpose, NotificationChannel, ReminderRepository, RepositoryFailure } from './ports'

const NO_CONTACT_ERROR = 'sin contacto registrado para la clienta'
const REMINDER_PURPOSE: MessagePurpose = 'reminder'

export type SendDueRemindersDeps = {
  claimDuePending: ReminderRepository['claimDuePending']
  releaseToPending: ReminderRepository['releaseToPending']
  getContact: ClientContactPort['getContact']
  markSent: ReminderRepository['markSent']
  markRetry: ReminderRepository['markRetry']
  markExhausted: ReminderRepository['markExhausted']
  recordAttempt: ReminderRepository['recordAttempt']
  primaryChannel: NotificationChannel
  backupChannel: NotificationChannel
  clock: Clock
}

export type SendDueRemindersSummary = { sent: number; retried: number; exhausted: number; errored: number }

type SendOutcome = 'sent' | 'retried' | 'exhausted' | 'errored'

const recordAttempt = async (deps: SendDueRemindersDeps, attempt: ReminderAttempt): Promise<void> => {
  const recorded = await deps.recordAttempt(attempt)
  if (isErr(recorded)) console.error(`[notifications] no se pudo registrar el intento del recordatorio ${attempt.reminderId} (${attempt.outcome}): ${recorded.error}`)
}

const toChannelAttempt = (
  reminder: ReminderSnapshot,
  channel: NotificationChannel,
  sendResult: Result<void, ChannelSendFailed | ChannelNotConfigured>,
  attemptedAt: Date,
): ReminderAttempt => {
  const base = { reminderId: reminder.id, attemptNumber: reminder.attempts + 1, channel: channel.kind, attemptedAt }
  if (isOk(sendResult)) return { ...base, outcome: REMINDER_ATTEMPT_OUTCOMES.sent, error: null }
  const outcome = isChannelNotConfigured(sendResult.error) ? REMINDER_ATTEMPT_OUTCOMES.notConfigured : REMINDER_ATTEMPT_OUTCOMES.failed
  return { ...base, outcome, error: sanitizeProviderError(sendResult.error.message) }
}

const registerFailure = async (
  deps: SendDueRemindersDeps,
  reminder: ReminderSnapshot,
  error: string,
  isPermanent: boolean,
): Promise<Result<'retried' | 'exhausted', RepositoryFailure>> => {
  const nextAttempts = reminder.attempts + 1
  const sanitizedError = sanitizeProviderError(error)
  if (isPermanent || hasExhaustedRetries({ ...reminder, attempts: nextAttempts })) {
    const marked = await deps.markExhausted(reminder.id, nextAttempts, sanitizedError)
    if (isErr(marked)) return marked
    return ok('exhausted')
  }
  const marked = await deps.markRetry(reminder.id, nextAttempts, sanitizedError)
  if (isErr(marked)) return marked
  return ok('retried')
}

const sendOne = async (deps: SendDueRemindersDeps, reminder: ReminderSnapshot, now: Date): Promise<SendOutcome> => {
  const contact = await deps.getContact(reminder.clientId)
  if (isErr(contact)) {
    console.error(`[notifications] no se pudo leer el contacto de ${reminder.clientId} para el recordatorio ${reminder.id}: ${contact.error}`)
    const released = await deps.releaseToPending(reminder.id)
    if (isErr(released)) console.error(`[notifications] no se pudo liberar a pending el recordatorio ${reminder.id} tras el fallo de contacto: ${released.error}`)
    return 'errored'
  }
  if (contact.value === null) {
    await recordAttempt(deps, {
      reminderId: reminder.id, attemptNumber: reminder.attempts + 1, channel: null,
      outcome: REMINDER_ATTEMPT_OUTCOMES.noContact, error: NO_CONTACT_ERROR, attemptedAt: now,
    })
    const registered = await registerFailure(deps, reminder, NO_CONTACT_ERROR, false)
    if (isErr(registered)) { console.error(`[notifications] no se pudo registrar el fallo de contacto del recordatorio ${reminder.id}: ${registered.error}`); return 'errored' }
    return registered.value
  }

  const reminderMessageInput = { techniqueName: reminder.techniqueName, startsAt: reminder.startsAt }
  const message = buildReminderMessage(reminderMessageInput)
  const templateVariables = buildReminderTemplateVariables(reminderMessageInput)

  const primary = await deps.primaryChannel.send({ messageId: reminder.id, purpose: REMINDER_PURPOSE, contact: contact.value, message, templateVariables })
  await recordAttempt(deps, toChannelAttempt(reminder, deps.primaryChannel, primary, now))
  if (isOk(primary)) {
    const marked = await deps.markSent(reminder.id, deps.primaryChannel.kind, now)
    if (isErr(marked)) { console.error(`[notifications] se mandó el recordatorio ${reminder.id} por ${deps.primaryChannel.kind} pero no se pudo marcar sent: ${marked.error}`); return 'errored' }
    return 'sent'
  }

  const backup = await deps.backupChannel.send({ messageId: reminder.id, purpose: REMINDER_PURPOSE, contact: contact.value, message, templateVariables })
  await recordAttempt(deps, toChannelAttempt(reminder, deps.backupChannel, backup, now))
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
