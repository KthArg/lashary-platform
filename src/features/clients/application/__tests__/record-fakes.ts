import { ok, err } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { validContent } from '../../domain/record/__tests__/record-fixtures'
import type { RecordCommandDeps } from '../record/record-commands'
import type { RecordActor, RecordAuditEvent, RecordRepository, RecordVersion } from '../record/record-ports'

export const ACTOR: RecordActor = { clientId: 'client-1', actorId: 'admin-1' }

export const SAVED_AT = '2026-10-17T16:00:00Z'

export const initialVersion = (): RecordVersion => ({
  id: 'version-1',
  clientId: ACTOR.clientId,
  previousVersionId: null,
  changeKind: 'initial',
  content: validContent(),
  createdBy: ACTOR.actorId,
  createdAt: fixedDate('2026-10-17T15:00:00Z'),
})

export function fakeRecordRepository(initial: RecordVersion[] = []) {
  const versions = [...initial]
  const repo: RecordRepository = {
    async listVersions(clientId, limit) {
      return versions.filter((version) => version.clientId === clientId).reverse().slice(0, limit)
    },
    async findInitialVersion(clientId) {
      return versions.find((version) => version.clientId === clientId && version.previousVersionId === null) ?? null
    },
    async saveVersion(version) {
      const taken = versions.some(
        (saved) => saved.clientId === version.clientId && saved.previousVersionId === version.previousVersionId,
      )
      if (taken) return err('version-conflict')
      versions.push(version)
      return ok(version)
    },
  }
  return { repo, versions }
}

export function fakeAuditLog(succeeds = true) {
  const events: RecordAuditEvent[] = []
  const auditLog = async (event: RecordAuditEvent) => {
    events.push(event)
    return succeeds
  }
  return { auditLog, events }
}

export function commandDeps(initial: RecordVersion[] = [], auditSucceeds = true) {
  const { repo, versions } = fakeRecordRepository(initial)
  const { auditLog, events } = fakeAuditLog(auditSucceeds)
  let nextId = 0
  const deps: RecordCommandDeps = {
    repo,
    auditLog,
    techniques: {
      async findActiveTechnique(techniqueId) {
        return techniqueId === 'technique-volume' ? { id: techniqueId, name: 'Volumen' } : null
      },
    },
    categories: {
      async findCategory(categoryId) {
        return categoryId === 'category-condition' ? { id: categoryId, name: 'Condición relevante' } : null
      },
    },
    newId: () => `generated-${++nextId}`,
    clock: fixedClock(SAVED_AT),
  }
  return { deps, versions, events }
}
