import { ok, isErr, isOk, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { logError } from '@/shared/logger'
import { MAX_REMINDER_ATTEMPTS } from '../domain/reminder'
import { reapplicationCycleKey } from '../domain/reapplication-reminder'
import { buildReapplicationMessage, buildReapplicationTemplateVariables } from '../domain/reapplication-message'
import { isChannelNotConfigured } from '../domain/errors'
import type {
  ClientContactPort,
  DueReapplicationReminder,
  MessagePurpose,
  NotificationChannel,
  ReapplicationReminderRecord,
  ReapplicationReminderRepository,
  RepositoryFailure,
} from './ports'

const REAPPLICATION_PURPOSE: MessagePurpose = 'reapplication_reminder'
const LIST_RECORDS_BATCH_SIZE = 100

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

type SendOutcome = 'sent' | 'retried' | 'exhausted' | 'errored' | 'skipped'

function chunk<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size))
  return batches
}

async function listRecordsInBatches(
  listRecords: ReapplicationReminderRepository['listRecords'],
  clientIds: readonly string[],
): Promise<Result<ReadonlyMap<string, ReapplicationReminderRecord>, RepositoryFailure>> {
  const merged = new Map<string, ReapplicationReminderRecord>()
  for (const batch of chunk(clientIds, LIST_RECORDS_BATCH_SIZE)) {
    const result = await listRecords(batch)
    if (isErr(result)) return result
    for (const [key, record] of result.value) merged.set(key, record)
  }
  return ok(merged)
}

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

  const registerFailure = async (error: string): Promise<SendOutcome> => {
    const recorded = await deps.recordFailed({ ...base, error, failedAt: now })
    if (isErr(recorded)) {
      logError('notifications', `no se pudo registrar el fallo de re-aplicación de ${due.clientId}/${due.techniqueId}`, recorded.error)
      return 'errored'
    }
    return nextAttempts >= MAX_REMINDER_ATTEMPTS ? 'exhausted' : 'retried'
  }

  const contact = await deps.getContact(due.clientId)
  if (isErr(contact)) {
    logError('notifications', `no se pudo leer el contacto de ${due.clientId} para la re-aplicación`, contact.error)
    return 'errored'
  }
  if (contact.value === null) return 'skipped'

  const message = buildReapplicationMessage({ ...due, now })
  const templateVariables = buildReapplicationTemplateVariables({ ...due, now })
  const messageId = reapplicationCycleKey(due.clientId, due.techniqueId, due.lastCompletedAt)

  const sendErrors: string[] = []
  for (const channel of [deps.primaryChannel, deps.backupChannel]) {
    const sent = await channel.send({ messageId, purpose: REAPPLICATION_PURPOSE, contact: contact.value, message, templateVariables })
    if (isOk(sent)) {
      const recorded = await deps.recordSent({ ...base, channel: channel.kind, sentAt: now })
      if (isErr(recorded)) {
        logError('notifications', `se mandó la re-aplicación de ${due.clientId}/${due.techniqueId} pero no se pudo registrar`, recorded.error)
        return 'errored'
      }
      return 'sent'
    }
    if (!isChannelNotConfigured(sent.error)) sendErrors.push(sent.error.message)
  }

  if (sendErrors.length === 0) return 'skipped'

  return registerFailure(sendErrors.join('; '))
}

export const sendDueReapplications =
  (deps: SendDueReapplicationsDeps) =>
  async (due: readonly DueReapplicationReminder[]): Promise<Result<SendDueReapplicationsSummary, RepositoryFailure>> => {
    const now = deps.clock()
    const summary: SendDueReapplicationsSummary = { sent: 0, retried: 0, exhausted: 0, skipped: 0, errored: 0 }
    if (due.length === 0) return ok(summary)

    const clientIds = [...new Set(due.map((reminder) => reminder.clientId))]
    const records = await listRecordsInBatches(deps.listRecords, clientIds)
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
