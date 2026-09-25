import { describe, it, expect } from 'vitest'
import { isOk, isErr } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import type { DepositExemption } from '../../domain/deposit-exemption'
import { ClientAlreadyExempt } from '../../domain/errors'
import type { DepositExemptionRepository, RecordAuditEvent } from '../ports'
import { exemptClient } from '../exempt-client'

class InMemoryDepositExemptionRepository implements DepositExemptionRepository {
  readonly saved: DepositExemption[] = []
  private readonly activeClients = new Set<string>()

  async save(exemption: DepositExemption): Promise<void> {
    if (exemption.active && this.activeClients.has(exemption.clientId)) {
      throw new ClientAlreadyExempt(exemption.clientId)
    }
    this.activeClients.add(exemption.clientId)
    this.saved.push(exemption)
  }
}

function buildDeps(repo: DepositExemptionRepository, recordAuditEvent: RecordAuditEvent) {
  let counter = 0
  return {
    repo,
    newId: () => `exm-${++counter}`,
    clock: fixedClock('2026-09-24T10:00:00Z'),
    recordAuditEvent,
  }
}

describe('exemptClient', () => {
  it('crea la exoneración, la persiste y registra el evento en la bitácora', async () => {
    const repo = new InMemoryDepositExemptionRepository()
    const auditCalls: unknown[] = []
    const recordAuditEvent: RecordAuditEvent = async (input) => {
      auditCalls.push(input)
    }

    const result = await exemptClient(buildDeps(repo, recordAuditEvent))({
      clientId: '00000000-0000-0000-0000-0000000000c1',
      exemptedBy: '00000000-0000-0000-0000-0000000000a1',
      reason: 'caso especial',
    })

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({
      id: 'exm-1',
      clientId: '00000000-0000-0000-0000-0000000000c1',
      exemptedBy: '00000000-0000-0000-0000-0000000000a1',
      reason: 'caso especial',
      active: true,
      createdAt: fixedDate('2026-09-24T10:00:00Z'),
    })
    expect(repo.saved).toHaveLength(1)

    expect(auditCalls).toEqual([
      {
        actorId: '00000000-0000-0000-0000-0000000000a1',
        action: 'payments.deposit_exemption.granted',
        entityType: 'clients_profile',
        entityId: '00000000-0000-0000-0000-0000000000c1',
        payload: { reason: 'caso especial', exemptionId: 'exm-1' },
      },
    ])
  })

  it('una exoneración inválida no se persiste ni se audita', async () => {
    const repo = new InMemoryDepositExemptionRepository()
    const auditCalls: unknown[] = []
    const recordAuditEvent: RecordAuditEvent = async (input) => {
      auditCalls.push(input)
    }

    const result = await exemptClient(buildDeps(repo, recordAuditEvent))({
      clientId: '00000000-0000-0000-0000-0000000000c1',
      exemptedBy: '00000000-0000-0000-0000-0000000000a1',
      reason: '   ',
    })

    expect(isErr(result)).toBe(true)
    expect(repo.saved).toHaveLength(0)
    expect(auditCalls).toHaveLength(0)
  })

  it('un cliente con exoneración vigente no puede recibir una segunda (Result, no throw)', async () => {
    const repo = new InMemoryDepositExemptionRepository()
    const recordAuditEvent: RecordAuditEvent = async () => {}
    const deps = buildDeps(repo, recordAuditEvent)

    const first = await exemptClient(deps)({
      clientId: '00000000-0000-0000-0000-0000000000c1',
      exemptedBy: '00000000-0000-0000-0000-0000000000a1',
      reason: 'primera',
    })
    expect(isOk(first)).toBe(true)

    const second = await exemptClient(deps)({
      clientId: '00000000-0000-0000-0000-0000000000c1',
      exemptedBy: '00000000-0000-0000-0000-0000000000a1',
      reason: 'segunda',
    })

    expect(isErr(second)).toBe(true)
    if (isOk(second)) return
    expect(second.error).toBeInstanceOf(ClientAlreadyExempt)
    expect(repo.saved).toHaveLength(1)
  })
})
