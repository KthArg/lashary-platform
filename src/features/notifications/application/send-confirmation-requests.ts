import { ok, isErr, isOk, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import {
  buildConfirmationMessage,
  buildConfirmationTemplateVariables,
  type ConfirmationRequest,
} from '../domain/confirmation-request'
import { MAX_REMINDER_ATTEMPTS } from '../domain/reminder'
import { isChannelNotConfigured } from '../domain/errors'
import { sanitizeProviderError } from '../domain/provider-error'
import type {
  ClientContactPort,
  ConfirmationRequestRepository,
  MessagePurpose,
  NotificationChannel,
  RepositoryFailure,
} from './ports'

const CONFIRMATION_PURPOSE: MessagePurpose = 'appointment_confirmation'
const NO_CONTACT_ERROR = 'sin contacto registrado para la clienta'

export type SendConfirmationRequestsDeps = {
  requests: ConfirmationRequestRepository
  getContact: ClientContactPort['getContact']
  primaryChannel: NotificationChannel
  backupChannel: NotificationChannel
  appointmentsUrl: string
  clock: Clock
}

export type SendConfirmationRequestsSummary = {
  sent: number
  retried: number
  exhausted: number
  errored: number
  unconfigured: number
  cancelled: number
}

type SendOutcome = keyof SendConfirmationRequestsSummary

const registerFailure = async (
  deps: SendConfirmationRequestsDeps,
  request: ConfirmationRequest,
  error: string,
): Promise<SendOutcome> => {
  const attempts = request.attempts + 1
  const hasExhausted = attempts >= MAX_REMINDER_ATTEMPTS
  const sanitizedError = sanitizeProviderError(error)
  const marked = hasExhausted
    ? await deps.requests.markExhausted(request.id, attempts, sanitizedError)
    : await deps.requests.markRetry(request.id, attempts, sanitizedError)
  if (isErr(marked)) {
    console.error(`[notifications] no se pudo registrar el fallo de la solicitud ${request.id}: ${marked.error}`)
    return 'errored'
  }
  return hasExhausted ? 'exhausted' : 'retried'
}

const leaveForLater = async (deps: SendConfirmationRequestsDeps, request: ConfirmationRequest): Promise<SendOutcome> => {
  const released = await deps.requests.releaseToPending(request.id)
  if (isErr(released)) {
    console.error(`[notifications] no se pudo liberar la solicitud ${request.id}: ${released.error}`)
    return 'errored'
  }
  return 'unconfigured'
}

const markSent = async (
  deps: SendConfirmationRequestsDeps,
  request: ConfirmationRequest,
  channel: NotificationChannel,
  now: Date,
): Promise<SendOutcome> => {
  const marked = await deps.requests.markSent(request.id, channel.kind, now)
  if (isErr(marked) && marked.error === 'not-claimed') return 'cancelled'
  if (isErr(marked)) {
    console.error(`[notifications] se mandó la solicitud ${request.id} pero no se pudo marcar sent: ${marked.error}`)
    return 'errored'
  }
  return 'sent'
}

const sendOne = async (
  deps: SendConfirmationRequestsDeps,
  request: ConfirmationRequest,
  now: Date,
): Promise<SendOutcome> => {
  const stillClaimed = await deps.requests.isStillClaimed(request.id)
  if (isErr(stillClaimed)) {
    console.error(`[notifications] no se pudo comprobar la solicitud ${request.id} antes de enviar: ${stillClaimed.error}`)
    return 'errored'
  }
  if (!stillClaimed.value) return 'cancelled'

  const contact = await deps.getContact(request.clientId)
  if (isErr(contact)) {
    console.error(`[notifications] no se pudo leer el contacto de la solicitud ${request.id}: ${contact.error}`)
    const released = await deps.requests.releaseToPending(request.id)
    if (isErr(released)) console.error(`[notifications] no se pudo liberar la solicitud ${request.id}: ${released.error}`)
    return 'errored'
  }
  if (contact.value === null) return registerFailure(deps, request, NO_CONTACT_ERROR)

  const messageInput = {
    serviceName: request.serviceName,
    startsAt: request.startsAt,
    appointmentsUrl: deps.appointmentsUrl,
  }
  const channelInput = {
    messageId: request.id,
    purpose: CONFIRMATION_PURPOSE,
    contact: contact.value,
    message: buildConfirmationMessage(messageInput),
    templateVariables: buildConfirmationTemplateVariables(messageInput),
  }

  const primary = await deps.primaryChannel.send(channelInput)
  if (isOk(primary)) return markSent(deps, request, deps.primaryChannel, now)

  const backup = await deps.backupChannel.send(channelInput)
  if (isOk(backup)) return markSent(deps, request, deps.backupChannel, now)

  const noChannelConfigured = isChannelNotConfigured(primary.error) && isChannelNotConfigured(backup.error)
  if (noChannelConfigured) return leaveForLater(deps, request)
  return registerFailure(deps, request, `${primary.error.message}; ${backup.error.message}`)
}

export const sendConfirmationRequests =
  (deps: SendConfirmationRequestsDeps) =>
  async (): Promise<Result<SendConfirmationRequestsSummary, RepositoryFailure>> => {
    const now = deps.clock()
    const claimed = await deps.requests.claimPending(now)
    if (isErr(claimed)) return claimed

    const summary: SendConfirmationRequestsSummary = { sent: 0, retried: 0, exhausted: 0, errored: 0, unconfigured: 0, cancelled: 0 }
    for (const request of claimed.value) {
      const outcome = await sendOne(deps, request, now)
      summary[outcome] += 1
    }
    return ok(summary)
  }
