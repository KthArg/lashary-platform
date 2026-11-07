import { ok, isErr, isOk, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { logError } from '@/shared/logger'
import { hasExhaustedNoticeRetries, type ClientNoticeDelivery } from '../domain/client-notice'
import { buildClientNoticeMessage, buildClientNoticeTemplateVariables } from '../domain/client-notice-message'
import { isChannelNotConfigured } from '../domain/errors'
import type {
  ClientContactPort,
  ClientNoticeDeliveryRepository,
  MessagePurpose,
  NotificationChannel,
  RepositoryFailure,
} from './ports'

const MAX_LAST_ERROR_LENGTH = 500
const NOTICE_PURPOSE: MessagePurpose = 'reschedule_outcome'
const NO_CONTACT = 'sin contacto registrado para la clienta'

export type SendClientNoticesDeps = {
  clientNotices: ClientNoticeDeliveryRepository
  getContact: ClientContactPort['getContact']
  primaryChannel: NotificationChannel
  backupChannel: NotificationChannel
  clock: Clock
}

export type SendClientNoticesSummary = { sent: number; retried: number; exhausted: number; errored: number }

type SendOutcome = keyof SendClientNoticesSummary

const truncate = (error: string): string =>
  error.length > MAX_LAST_ERROR_LENGTH ? `${error.slice(0, MAX_LAST_ERROR_LENGTH)}…` : error

const registerFailure = async (
  deps: SendClientNoticesDeps,
  notice: ClientNoticeDelivery,
  error: string,
  isPermanent: boolean,
): Promise<SendOutcome> => {
  const attempts = notice.attempts + 1
  const exhausted = isPermanent || hasExhaustedNoticeRetries({ ...notice, attempts })
  const marked = exhausted
    ? await deps.clientNotices.markExhausted(notice.id, attempts, truncate(error))
    : await deps.clientNotices.markRetry(notice.id, attempts, truncate(error))
  if (isErr(marked)) {
    logError('notifications', `no se pudo registrar el fallo de envío del aviso ${notice.id}`, marked.error)
    return 'errored'
  }
  return exhausted ? 'exhausted' : 'retried'
}

const markSent = async (
  deps: SendClientNoticesDeps,
  notice: ClientNoticeDelivery,
  channel: NotificationChannel,
  now: Date,
): Promise<SendOutcome> => {
  const marked = await deps.clientNotices.markSent(notice.id, channel.kind, now)
  if (isErr(marked)) {
    logError('notifications', `se mandó el aviso ${notice.id} por ${channel.kind} pero no se pudo marcar enviado`, marked.error)
    return 'errored'
  }
  return 'sent'
}

const sendOne = async (deps: SendClientNoticesDeps, notice: ClientNoticeDelivery, now: Date): Promise<SendOutcome> => {
  const contact = await deps.getContact(notice.clientId)
  if (isErr(contact)) {
    logError('notifications', `no se pudo leer el contacto de ${notice.clientId} para el aviso ${notice.id}`, contact.error)
    const released = await deps.clientNotices.releaseToPending(notice.id)
    if (isErr(released)) logError('notifications', `no se pudo soltar el aviso ${notice.id}`, released.error)
    return 'errored'
  }
  if (contact.value === null) return registerFailure(deps, notice, NO_CONTACT, false)

  const input = {
    messageId: notice.id,
    purpose: NOTICE_PURPOSE,
    contact: contact.value,
    message: buildClientNoticeMessage(notice),
    templateVariables: buildClientNoticeTemplateVariables(notice),
  }
  const primary = await deps.primaryChannel.send(input)
  if (isOk(primary)) return markSent(deps, notice, deps.primaryChannel, now)

  const backup = await deps.backupChannel.send(input)
  if (isOk(backup)) return markSent(deps, notice, deps.backupChannel, now)

  const bothUnconfigured = isChannelNotConfigured(primary.error) && isChannelNotConfigured(backup.error)
  return registerFailure(deps, notice, `${primary.error.message}; ${backup.error.message}`, bothUnconfigured)
}

export const sendClientNotices =
  (deps: SendClientNoticesDeps) =>
  async (): Promise<Result<SendClientNoticesSummary, RepositoryFailure>> => {
    const now = deps.clock()
    const due = await deps.clientNotices.claimDue(now)
    if (isErr(due)) return due

    const summary: SendClientNoticesSummary = { sent: 0, retried: 0, exhausted: 0, errored: 0 }
    for (const notice of due.value) summary[await sendOne(deps, notice, now)] += 1
    return ok(summary)
  }
