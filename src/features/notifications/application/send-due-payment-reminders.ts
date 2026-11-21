import { ok, isErr, isOk, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { logError } from '@/shared/logger'
import { hasReachedPaymentReminderAttemptLimit, paymentReminderDay, paymentReminderKey } from '../domain/payment-reminder'
import { sanitizeProviderError } from '../domain/provider-error'
import { buildPaymentReminderMessage, buildPaymentReminderTemplateVariables } from '../domain/payment-reminder-message'
import { isChannelNotConfigured } from '../domain/errors'
import type {
  ClientContactPort,
  DuePaymentReminder,
  MessagePurpose,
  NotificationChannel,
  PaymentReminderFailurePort,
  PaymentReminderLogPort,
  RepositoryFailure,
} from './ports'

const PAYMENT_PURPOSE: MessagePurpose = 'payment_reminder'

export type SendDuePaymentRemindersDeps = {
  regularizeUrl: string
  recordSent: PaymentReminderLogPort['recordSent']
  attemptsOn: PaymentReminderFailurePort['attemptsOn']
  recordFailure: PaymentReminderFailurePort['recordFailure']
  getContact: ClientContactPort['getContact']
  primaryChannel: NotificationChannel
  backupChannel: NotificationChannel
  clock: Clock
}

export type SendDuePaymentRemindersSummary = { sent: number; skipped: number; failed: number; exhausted: number; errored: number }

type SendOutcome = keyof SendDuePaymentRemindersSummary

const sendOne = async (deps: SendDuePaymentRemindersDeps, due: DuePaymentReminder, now: Date): Promise<SendOutcome> => {
  const contact = await deps.getContact(due.clientId)
  if (isErr(contact)) {
    logError('notifications', `no se pudo leer el contacto de ${due.clientId} para el recordatorio de pago`, contact.error)
    return 'errored'
  }
  if (contact.value === null) return 'skipped'

  const messageInput = { amountOwed: due.amountOwed, regularizeUrl: deps.regularizeUrl }
  const message = buildPaymentReminderMessage(messageInput)
  const templateVariables = buildPaymentReminderTemplateVariables(messageInput)
  const messageId = paymentReminderKey(due.clientId, now)

  const sendErrors: string[] = []
  for (const channel of [deps.primaryChannel, deps.backupChannel]) {
    const sent = await channel.send({ messageId, purpose: PAYMENT_PURPOSE, contact: contact.value, message, templateVariables })
    if (isOk(sent)) {
      const recorded = await deps.recordSent({ clientId: due.clientId, amountOwed: due.amountOwed, channel: channel.kind, sentAt: now })
      if (isErr(recorded)) {
        logError('notifications', `se mandó el recordatorio de pago de ${due.clientId} pero no se pudo registrar`, recorded.error)
        return 'errored'
      }
      return 'sent'
    }
    if (!isChannelNotConfigured(sent.error)) sendErrors.push(sanitizeProviderError(sent.error.message))
  }

  if (sendErrors.length === 0) return 'skipped'

  const failure = sendErrors.join('; ')
  logError('notifications', `falló el recordatorio de pago de ${due.clientId}: ${failure}`)
  const recordedFailure = await deps.recordFailure({ clientId: due.clientId, day: paymentReminderDay(now), error: failure, failedAt: now })
  if (isErr(recordedFailure)) {
    logError('notifications', `no se pudo registrar el fallo del recordatorio de pago de ${due.clientId}`, recordedFailure.error)
    return 'errored'
  }
  return 'failed'
}

export const sendDuePaymentReminders =
  (deps: SendDuePaymentRemindersDeps) =>
  async (due: readonly DuePaymentReminder[]): Promise<Result<SendDuePaymentRemindersSummary, RepositoryFailure>> => {
    const now = deps.clock()
    const summary: SendDuePaymentRemindersSummary = { sent: 0, skipped: 0, failed: 0, exhausted: 0, errored: 0 }
    if (due.length === 0) return ok(summary)

    const attemptsToday = await deps.attemptsOn(
      due.map((reminder) => reminder.clientId),
      paymentReminderDay(now),
    )
    if (isErr(attemptsToday)) return attemptsToday

    for (const reminder of due) {
      if (hasReachedPaymentReminderAttemptLimit(attemptsToday.value.get(reminder.clientId) ?? 0)) {
        summary.exhausted += 1
        continue
      }
      const outcome = await sendOne(deps, reminder, now)
      summary[outcome] += 1
    }

    return ok(summary)
  }
