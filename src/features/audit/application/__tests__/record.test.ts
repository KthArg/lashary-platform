import { describe, it, expect } from 'vitest'
import { isOk, isErr } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import type { AuditEvent } from '../../domain/audit-event'
import type { AuditEventRepository } from '../ports'
import { record } from '../record'

class InMemoryAuditEventRepository implements AuditEventRepository {
  readonly inserted: AuditEvent[] = []

  async insert(event: AuditEvent): Promise<void> {
    this.inserted.push(event)
  }
}

function buildDeps(repo: AuditEventRepository) {
  let counter = 0
  return {
    repo,
    newId: () => `evt-${++counter}`,
    clock: fixedClock('2026-09-23T10:00:00Z'),
  }
}

describe('record', () => {
  it('construye el evento, lo persiste y devuelve su vista', async () => {
    const repo = new InMemoryAuditEventRepository()
    const result = await record(buildDeps(repo))({
      actorId: '00000000-0000-0000-0000-0000000000a1',
      action: 'payments.deposit_exemption.granted',
      entityType: 'clients_profile',
      entityId: '00000000-0000-0000-0000-0000000000c1',
      payload: { reason: 'caso especial' },
    })

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({
      id: 'evt-1',
      actorId: '00000000-0000-0000-0000-0000000000a1',
      action: 'payments.deposit_exemption.granted',
      entityType: 'clients_profile',
      entityId: '00000000-0000-0000-0000-0000000000c1',
      payload: { reason: 'caso especial' },
      createdAt: fixedDate('2026-09-23T10:00:00Z'),
    })
    expect(repo.inserted).toHaveLength(1)
    expect(repo.inserted[0].id).toBe('evt-1')
  })

  it('payload es opcional y por defecto queda vacío', async () => {
    const repo = new InMemoryAuditEventRepository()
    const result = await record(buildDeps(repo))({
      actorId: '00000000-0000-0000-0000-0000000000a1',
      action: 'x',
      entityType: 'y',
      entityId: '00000000-0000-0000-0000-0000000000c1',
    })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.payload).toEqual({})
  })

  it('un evento inválido no se persiste', async () => {
    const repo = new InMemoryAuditEventRepository()
    const result = await record(buildDeps(repo))({
      actorId: '00000000-0000-0000-0000-0000000000a1',
      action: '',
      entityType: 'y',
      entityId: '00000000-0000-0000-0000-0000000000c1',
    })

    expect(isErr(result)).toBe(true)
    expect(repo.inserted).toHaveLength(0)
  })

  it('cada llamada usa el generador de id inyectado', async () => {
    const repo = new InMemoryAuditEventRepository()
    const deps = buildDeps(repo)

    const first = await record(deps)({
      actorId: '00000000-0000-0000-0000-0000000000a1',
      action: 'x',
      entityType: 'y',
      entityId: '00000000-0000-0000-0000-0000000000c1',
    })
    const second = await record(deps)({
      actorId: '00000000-0000-0000-0000-0000000000a1',
      action: 'x',
      entityType: 'y',
      entityId: '00000000-0000-0000-0000-0000000000c1',
    })

    expect(isOk(first)).toBe(true)
    expect(isOk(second)).toBe(true)
    if (!isOk(first) || !isOk(second)) return
    expect(first.value.id).not.toBe(second.value.id)
  })
})
