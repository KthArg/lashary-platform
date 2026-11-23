import { ok, isErr, isOk, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { logError } from '@/shared/logger'
import { paymentReminderKey } from '../domain/payment-reminder'
import { buildPaymentReminderMessage, buildPaymentReminderTemplateVariables } from '../domain/payment-reminder-message'
import { isChannelNotConfigured } from '../domain/errors'
import type {
  ClientContactPort,
  DuePaymentReminder,
  MessagePurpose,
  NotificationChannel,
  PaymentReminderLogPort,
  RepositoryFailure,
} from './ports'

const PAYMENT_PURPOSE: MessagePurpose = 'payment_reminder'

export type SendDuePaymentRemindersDeps = {
  recordSent: PaymentReminderLogPort['recordSent']
  getContact: ClientContactPort['getContact']
  primaryChannel: NotificationChannel
  backupChannel: NotificationChannel
  clock: Clock
}

export type SendDuePaymentRemindersSummary = { sent: number; skipped: number; failed: number; errored: number }

type SendOutcome = keyof SendDuePaymentRemindersSummary

const sendOne = async (deps: SendDuePaymentRemindersDeps, due: DuePaymentReminder, now: Date): Promise<SendOutcome> => {
  const contact = await deps.getContact(due.clientId)
  if (isErr(contact)) {
    logError('notifications', `no se pudo leer el contacto de ${due.clientId} para el recordatorio de pago`, contact.error)
    return 'errored'
  }
  if (contact.value === null) return 'skipped'

  const messageInput = { amountOwed: due.amountOwed }
  const message = buildPaymentReminderMessage(messageInput)
  const templateVariables = buildPaymentReminderTemplateVariables(messageInput)
  const messageId = paymentReminderKey(due.clientId, now)

  let sendFailed = false
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
    if (!isChannelNotConfigured(sent.error)) sendFailed = true
  }

  return sendFailed ? 'failed' : 'skipped'
}

export const sendDuePaymentReminders =
  (deps: SendDuePaymentRemindersDeps) =>
  async (due: readonly DuePaymentReminder[]): Promise<Result<SendDuePaymentRemindersSummary, RepositoryFailure>> => {
    const now = deps.clock()
    const summary: SendDuePaymentRemindersSummary = { sent: 0, skipped: 0, failed: 0, errored: 0 }

    for (const reminder of due) {
      const outcome = await sendOne(deps, reminder, now)
      summary[outcome] += 1
    }

    return ok(summary)
  }
