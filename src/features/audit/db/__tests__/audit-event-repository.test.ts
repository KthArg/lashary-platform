import { describe, it, expect } from 'vitest'
import { isOk } from '@/shared/result'
import { AuditEvent } from '@/features/audit/domain/audit-event'
import { toRow } from '../audit-event-repository'

describe('toRow', () => {
  it('mapea el evento de dominio a la fila que espera audit_events', () => {
    const built = AuditEvent.create('evt-1', {
      actorId: '00000000-0000-0000-0000-0000000000a1',
      action: 'payments.deposit_exemption.granted',
      entityType: 'clients_profile',
      entityId: '00000000-0000-0000-0000-0000000000c1',
      payload: { reason: 'caso especial' },
      createdAt: new Date('2026-09-23T10:00:00Z'),
    })
    expect(isOk(built)).toBe(true)
    if (!isOk(built)) return

    expect(toRow(built.value)).toEqual({
      id: 'evt-1',
      actor_id: '00000000-0000-0000-0000-0000000000a1',
      action: 'payments.deposit_exemption.granted',
      entity_type: 'clients_profile',
      entity_id: '00000000-0000-0000-0000-0000000000c1',
      payload: { reason: 'caso especial' },
      created_at: '2026-09-23T10:00:00.000Z',
    })
  })
})
