import { ok, isErr, isOk, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { logError } from '@/shared/logger'
import type { InactiveReminderDelivery } from '../domain/inactive-reminder'
import { buildInactiveReminderMessage } from '../domain/inactive-reminder-message'
import { isChannelNotConfigured } from '../domain/errors'
import { sanitizeProviderError } from '../domain/provider-error'
import { MAX_REMINDER_ATTEMPTS } from '../domain/reminder'
import type {
  ClientContactPort,
  InactiveReminderDeliveryRepository,
  MessagePurpose,
  NotificationChannel,
  RepositoryFailure,
} from './ports'

const INACTIVE_REMINDER_PURPOSE: MessagePurpose = 'inactive_reminder'
export const NO_CONTACT_ERROR = 'sin contacto registrado para la clienta'

export type SendInactiveRemindersDeps = {
  deliveries: InactiveReminderDeliveryRepository
  getContact: ClientContactPort['getContact']
  channel: NotificationChannel
  bookingUrl: string
  unsubscribeUrlFor: (token: string) => string | null
  clock: Clock
}

export type SendInactiveRemindersSummary = {
  sent: number
  retried: number
  exhausted: number
  errored: number
  unconfigured: number
}

type SendOutcome = keyof SendInactiveRemindersSummary

const registerFailure = async (
  deps: SendInactiveRemindersDeps,
  delivery: InactiveReminderDelivery,
  error: string,
): Promise<SendOutcome> => {
  const attempts = delivery.attempts + 1
  const hasExhausted = attempts >= MAX_REMINDER_ATTEMPTS
  const sanitizedError = sanitizeProviderError(error)
  const marked = hasExhausted
    ? await deps.deliveries.markExhausted(delivery.id, attempts, sanitizedError)
    : await deps.deliveries.markRetry(delivery.id, attempts, sanitizedError)
  if (isErr(marked)) {
    logError('notifications', `no se pudo registrar el fallo del recordatorio a inactiva ${delivery.id}`, marked.error)
    return 'errored'
  }
  return hasExhausted ? 'exhausted' : 'retried'
}

const release = async (
  deps: SendInactiveRemindersDeps,
  delivery: InactiveReminderDelivery,
  outcome: SendOutcome,
): Promise<SendOutcome> => {
  const released = await deps.deliveries.releaseToPending(delivery.id)
  if (isErr(released)) {
    logError('notifications', `no se pudo liberar el recordatorio a inactiva ${delivery.id}`, released.error)
    return 'errored'
  }
  return outcome
}

const sendOne = async (
  deps: SendInactiveRemindersDeps,
  delivery: InactiveReminderDelivery,
  now: Date,
): Promise<SendOutcome> => {
  const unsubscribeUrl = deps.unsubscribeUrlFor(delivery.unsubscribeToken)
  if (unsubscribeUrl === null) return release(deps, delivery, 'unconfigured')

  const contact = await deps.getContact(delivery.clientId)
  if (isErr(contact)) {
    logError('notifications', `no se pudo leer el contacto del recordatorio a inactiva ${delivery.id}`, contact.error)
    return release(deps, delivery, 'errored')
  }
  if (contact.value === null) return registerFailure(deps, delivery, NO_CONTACT_ERROR)

  const sent = await deps.channel.send({
    messageId: delivery.id,
    purpose: INACTIVE_REMINDER_PURPOSE,
    contact: contact.value,
    message: buildInactiveReminderMessage({
      clientName: delivery.clientName,
      bookingUrl: deps.bookingUrl,
      unsubscribeUrl,
    }),
    templateVariables: [],
    unsubscribeUrl,
  })
  if (isOk(sent)) {
    const marked = await deps.deliveries.markSent(delivery.id, deps.channel.kind, now)
    if (isErr(marked)) {
      logError('notifications', `se mandó el recordatorio a inactiva ${delivery.id} pero no se pudo marcar sent`, marked.error)
      return 'errored'
    }
    return 'sent'
  }
  if (isChannelNotConfigured(sent.error)) return release(deps, delivery, 'unconfigured')
  return registerFailure(deps, delivery, sent.error.message)
}

export const sendInactiveReminders =
  (deps: SendInactiveRemindersDeps) =>
  async (): Promise<Result<SendInactiveRemindersSummary, RepositoryFailure>> => {
    const now = deps.clock()
    const claimed = await deps.deliveries.claimDue(now)
    if (isErr(claimed)) return claimed

    const summary: SendInactiveRemindersSummary = { sent: 0, retried: 0, exhausted: 0, errored: 0, unconfigured: 0 }
    for (const delivery of claimed.value) {
      const outcome = await sendOne(deps, delivery, now)
      summary[outcome] += 1
    }
    return ok(summary)
  }
