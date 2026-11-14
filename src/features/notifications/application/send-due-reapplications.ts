import { ok, isErr, isOk, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { MAX_REMINDER_ATTEMPTS } from '../domain/reminder'
import { reapplicationCycleKey } from '../domain/reapplication-reminder'
import { buildReapplicationMessage, buildReapplicationTemplateVariables } from '../domain/reapplication-message'
import { isChannelNotConfigured } from '../domain/errors'
import type {
  ClientContactPort,
  DueReapplicationReminder,
  MessagePurpose,
  NotificationChannel,
  ReapplicationReminderRepository,
  RepositoryFailure,
} from './ports'

const REAPPLICATION_PURPOSE: MessagePurpose = 'reapplication_reminder'
const NO_CONTACT_ERROR = 'sin contacto registrado para la clienta'

export type SendDueReapplicationsDeps = {
  listRecords: ReapplicationReminderRepository['listRecords']
  recordSent: ReapplicationReminderRepository['recordSent']
  recordFailed: ReapplicationReminderRepository['recordFailed']
  getContact: ClientContactPort['getContact']
  primaryChannel: NotificationChannel
  backupChannel: NotificationChannel
  clock: Clock
}

export type SendDueReapplicationsSummary = { sent: number; retried: number; exhausted: number; skipped: number; errored: number }

type SendOutcome = 'sent' | 'retried' | 'exhausted' | 'errored'

const sendOne = async (
  deps: SendDueReapplicationsDeps,
  due: DueReapplicationReminder,
  previousAttempts: number,
  now: Date,
): Promise<SendOutcome> => {
  const nextAttempts = previousAttempts + 1
  const base = {
    clientId: due.clientId,
    techniqueId: due.techniqueId,
    techniqueName: due.techniqueName,
    lastCompletedAt: due.lastCompletedAt,
    dueAt: due.dueAt,
    attempts: nextAttempts,
  }

  const registerFailure = async (error: string, isPermanent: boolean): Promise<SendOutcome> => {
    const recorded = await deps.recordFailed({ ...base, error, failedAt: now })
    if (isErr(recorded)) {
      console.error(`[notifications] no se pudo registrar el fallo de re-aplicación de ${due.clientId}/${due.techniqueId}: ${recorded.error}`)
      return 'errored'
    }
    return isPermanent || nextAttempts >= MAX_REMINDER_ATTEMPTS ? 'exhausted' : 'retried'
  }

  const contact = await deps.getContact(due.clientId)
  if (isErr(contact)) {
    console.error(`[notifications] no se pudo leer el contacto de ${due.clientId} para la re-aplicación: ${contact.error}`)
    return 'errored'
  }
  if (contact.value === null) return registerFailure(NO_CONTACT_ERROR, false)

  const message = buildReapplicationMessage(due)
  const templateVariables = buildReapplicationTemplateVariables(due)

  const primary = await deps.primaryChannel.send({
    messageId: reapplicationCycleKey(due.clientId, due.techniqueId, due.lastCompletedAt),
    purpose: REAPPLICATION_PURPOSE,
    contact: contact.value,
    message,
    templateVariables,
  })
  if (isOk(primary)) {
    const recorded = await deps.recordSent({ ...base, channel: deps.primaryChannel.kind, sentAt: now })
    if (isErr(recorded)) { console.error(`[notifications] se mandó la re-aplicación de ${due.clientId}/${due.techniqueId} pero no se pudo registrar: ${recorded.error}`); return 'errored' }
    return 'sent'
  }

  const backup = await deps.backupChannel.send({
    messageId: reapplicationCycleKey(due.clientId, due.techniqueId, due.lastCompletedAt),
    purpose: REAPPLICATION_PURPOSE,
    contact: contact.value,
    message,
    templateVariables,
  })
  if (isOk(backup)) {
    const recorded = await deps.recordSent({ ...base, channel: deps.backupChannel.kind, sentAt: now })
    if (isErr(recorded)) { console.error(`[notifications] se mandó la re-aplicación de ${due.clientId}/${due.techniqueId} pero no se pudo registrar: ${recorded.error}`); return 'errored' }
    return 'sent'
  }

  const bothChannelsUnconfigured = isChannelNotConfigured(primary.error) && isChannelNotConfigured(backup.error)
  return registerFailure(`${primary.error.message}; ${backup.error.message}`, bothChannelsUnconfigured)
}

export const sendDueReapplications =
  (deps: SendDueReapplicationsDeps) =>
  async (due: readonly DueReapplicationReminder[]): Promise<Result<SendDueReapplicationsSummary, RepositoryFailure>> => {
    const now = deps.clock()
    const summary: SendDueReapplicationsSummary = { sent: 0, retried: 0, exhausted: 0, skipped: 0, errored: 0 }
    if (due.length === 0) return ok(summary)

    const clientIds = [...new Set(due.map((d) => d.clientId))]
    const records = await deps.listRecords(clientIds)
    if (isErr(records)) return records

    for (const candidate of due) {
      const key = reapplicationCycleKey(candidate.clientId, candidate.techniqueId, candidate.lastCompletedAt)
      const record = records.value.get(key)

      if (record?.status === 'sent') { summary.skipped += 1; continue }
      if (record?.status === 'failed' && record.attempts >= MAX_REMINDER_ATTEMPTS) { summary.skipped += 1; continue }

      const outcome = await sendOne(deps, candidate, record?.attempts ?? 0, now)
      summary[outcome] += 1
    }

    return ok(summary)
  }
