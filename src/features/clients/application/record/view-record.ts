import { ok, err, type Result } from '@/shared/result'
import type { RecordActor, RecordAuditLog, RecordRepository, RecordVersion } from './record-ports'

export const RECORD_HISTORY_LIMIT = 50

export interface RecordView {
  readonly current: RecordVersion | null
  readonly history: readonly RecordVersion[]
  readonly initial: RecordVersion | null
}

export interface ViewRecordDeps {
  readonly repo: RecordRepository
  readonly auditLog: RecordAuditLog
}

export const viewRecord =
  (deps: ViewRecordDeps) =>
  async (actor: RecordActor): Promise<Result<RecordView, 'audit-failed'>> => {
    const audited = await deps.auditLog({ ...actor, action: 'clients.record.viewed' })
    if (!audited) return err('audit-failed')
    const [history, initial] = await Promise.all([
      deps.repo.listVersions(actor.clientId, RECORD_HISTORY_LIMIT),
      deps.repo.findInitialVersion(actor.clientId),
    ])
    return ok({ current: history[0] ?? null, history, initial })
  }
