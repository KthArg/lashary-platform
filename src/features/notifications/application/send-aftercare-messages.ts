import { ok, isErr, isOk, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { logError } from '@/shared/logger'
import type { AftercareMessage } from '../domain/aftercare-message'
import { buildAftercareMessage, buildAftercareTemplateVariables } from '../domain/aftercare-message-text'
import { isChannelNotConfigured } from '../domain/errors'
import { sanitizeProviderError } from '../domain/provider-error'
import { MAX_REMINDER_ATTEMPTS } from '../domain/reminder'
import type {
  AftercareDeliveryRepository,
  ClientContactPort,
  MessagePurpose,
  NotificationChannel,
  RepositoryFailure,
} from './ports'

const AFTERCARE_PURPOSE: MessagePurpose = 'aftercare'
export const NO_CONTACT_ERROR = 'sin contacto registrado para la clienta'

export type SendAftercareMessagesDeps = {
  aftercareMessages: AftercareDeliveryRepository
  getContact: ClientContactPort['getContact']
  primaryChannel: NotificationChannel
  backupChannel: NotificationChannel
  appointmentsUrl: string
  clock: Clock
}

export type SendAftercareMessagesSummary = {
  sent: number
  retried: number
  exhausted: number
  errored: number
  unconfigured: number
}

type SendOutcome = keyof SendAftercareMessagesSummary

const registerFailure = async (
  deps: SendAftercareMessagesDeps,
  message: AftercareMessage,
  error: string,
): Promise<SendOutcome> => {
  const attempts = message.attempts + 1
  const hasExhausted = attempts >= MAX_REMINDER_ATTEMPTS
  const sanitizedError = sanitizeProviderError(error)
  const marked = hasExhausted
    ? await deps.aftercareMessages.markExhausted(message.id, attempts, sanitizedError)
    : await deps.aftercareMessages.markRetry(message.id, attempts, sanitizedError)
  if (isErr(marked)) {
    logError('notifications', `no se pudo registrar el fallo de las indicaciones ${message.id}`, marked.error)
    return 'errored'
  }
  return hasExhausted ? 'exhausted' : 'retried'
}

const leaveForLater = async (deps: SendAftercareMessagesDeps, message: AftercareMessage): Promise<SendOutcome> => {
  const released = await deps.aftercareMessages.releaseToPending(message.id)
  if (isErr(released)) {
    logError('notifications', `no se pudieron liberar las indicaciones ${message.id}`, released.error)
    return 'errored'
  }
  return 'unconfigured'
}

const markSent = async (
  deps: SendAftercareMessagesDeps,
  message: AftercareMessage,
  channel: NotificationChannel,
  now: Date,
): Promise<SendOutcome> => {
  const marked = await deps.aftercareMessages.markSent(message.id, channel.kind, now)
  if (isErr(marked)) {
    logError('notifications', `se mandaron las indicaciones ${message.id} pero no se pudo marcar sent`, marked.error)
    return 'errored'
  }
  return 'sent'
}

const sendOne = async (deps: SendAftercareMessagesDeps, message: AftercareMessage, now: Date): Promise<SendOutcome> => {
  const contact = await deps.getContact(message.clientId)
  if (isErr(contact)) {
    logError('notifications', `no se pudo leer el contacto de las indicaciones ${message.id}`, contact.error)
    const released = await deps.aftercareMessages.releaseToPending(message.id)
    if (isErr(released)) logError('notifications', `no se pudieron liberar las indicaciones ${message.id}`, released.error)
    return 'errored'
  }
  if (contact.value === null) return registerFailure(deps, message, NO_CONTACT_ERROR)

  const channelInput = {
    messageId: message.id,
    purpose: AFTERCARE_PURPOSE,
    contact: contact.value,
    message: buildAftercareMessage(message, deps.appointmentsUrl),
    templateVariables: buildAftercareTemplateVariables(message, deps.appointmentsUrl),
  }

  const primary = await deps.primaryChannel.send(channelInput)
  if (isOk(primary)) return markSent(deps, message, deps.primaryChannel, now)

  const backup = await deps.backupChannel.send(channelInput)
  if (isOk(backup)) return markSent(deps, message, deps.backupChannel, now)

  const noChannelConfigured = isChannelNotConfigured(primary.error) && isChannelNotConfigured(backup.error)
  if (noChannelConfigured) return leaveForLater(deps, message)
  return registerFailure(deps, message, `${primary.error.message}; ${backup.error.message}`)
}

export const sendAftercareMessages =
  (deps: SendAftercareMessagesDeps) =>
  async (): Promise<Result<SendAftercareMessagesSummary, RepositoryFailure>> => {
    const now = deps.clock()
    const claimed = await deps.aftercareMessages.claimDue(now)
    if (isErr(claimed)) return claimed

    const summary: SendAftercareMessagesSummary = { sent: 0, retried: 0, exhausted: 0, errored: 0, unconfigured: 0 }
    for (const message of claimed.value) {
      const outcome = await sendOne(deps, message, now)
      summary[outcome] += 1
    }
    return ok(summary)
  }
