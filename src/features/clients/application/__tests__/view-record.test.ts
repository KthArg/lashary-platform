import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { viewRecord, RECORD_HISTORY_LIMIT } from '../record/view-record'
import { ACTOR, fakeAuditLog, fakeRecordRepository, initialVersion } from './record-fakes'

describe('viewRecord — cada lectura del expediente queda en la bitácora (criterio 3, SEC-006)', () => {
  it('registra el acceso con quién lo vio y de qué clienta', async () => {
    const { repo } = fakeRecordRepository([initialVersion()])
    const { auditLog, events } = fakeAuditLog()
    await viewRecord({ repo, auditLog })(ACTOR)
    expect(events).toEqual([{ ...ACTOR, action: 'clients.record.viewed' }])
  })

  it('devuelve la versión vigente y el historial, de la más nueva a la más vieja', async () => {
    const second = { ...initialVersion(), id: 'version-2', previousVersionId: 'version-1' }
    const { repo } = fakeRecordRepository([initialVersion(), second])
    const result = await viewRecord({ repo, auditLog: fakeAuditLog().auditLog })(ACTOR)
    if (!isOk(result)) throw new Error('debería leer')
    expect(result.value.current?.id).toBe('version-2')
    expect(result.value.history.map((version) => version.id)).toEqual(['version-2', 'version-1'])
  })

  it('una clienta sin expediente se lee como vacía, y el acceso igual se registra', async () => {
    const { auditLog, events } = fakeAuditLog()
    const result = await viewRecord({ repo: fakeRecordRepository().repo, auditLog })(ACTOR)
    if (!isOk(result)) throw new Error('debería leer')
    expect(result.value.current).toBeNull()
    expect(events).toHaveLength(1)
  })

  it('si la bitácora falla, no devuelve el expediente', async () => {
    const { repo } = fakeRecordRepository([initialVersion()])
    const result = await viewRecord({ repo, auditLog: fakeAuditLog(false).auditLog })(ACTOR)
    expect(isErr(result) && result.error).toBe('audit-failed')
  })

  it('pide como mucho el límite de versiones del historial', async () => {
    const requested: number[] = []
    const { repo } = fakeRecordRepository()
    const spiedRepo = { ...repo, listVersions: async (clientId: string, limit: number) => {
      requested.push(limit)
      return repo.listVersions(clientId, limit)
    } }
    await viewRecord({ repo: spiedRepo, auditLog: fakeAuditLog().auditLog })(ACTOR)
    expect(requested).toEqual([RECORD_HISTORY_LIMIT])
  })
})
