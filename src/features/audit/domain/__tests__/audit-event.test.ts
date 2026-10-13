import { describe, it, expect } from 'vitest'
import { isOk, isErr } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { AuditEvent } from '../audit-event'

const validInput = {
  actorId: '00000000-0000-0000-0000-0000000000a1',
  action: 'payments.deposit_exemption.granted',
  entityType: 'clients_profile',
  entityId: '00000000-0000-0000-0000-0000000000c1',
  createdAt: fixedDate('2026-09-23T10:00:00Z'),
}

describe('AuditEvent.create', () => {
  it('crea un evento válido y expone sus campos', () => {
    const result = AuditEvent.create('evt-1', validInput)
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return

    expect(result.value.id).toBe('evt-1')
    expect(result.value.actorId).toBe(validInput.actorId)
    expect(result.value.action).toBe(validInput.action)
    expect(result.value.entityType).toBe(validInput.entityType)
    expect(result.value.entityId).toBe(validInput.entityId)
    expect(result.value.createdAt).toEqual(validInput.createdAt)
  })

  it('el payload es opcional y por defecto queda vacío', () => {
    const result = AuditEvent.create('evt-2', validInput)
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.payload).toEqual({})
  })

  it('conserva el payload cuando se provee', () => {
    const result = AuditEvent.create('evt-3', {
      ...validInput,
      payload: { reason: 'promoción de bienvenida' },
    })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.payload).toEqual({ reason: 'promoción de bienvenida' })
  })

  it('recorta espacios en los campos de texto', () => {
    const result = AuditEvent.create('evt-4', {
      ...validInput,
      action: '  payments.deposit_exemption.granted  ',
    })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.action).toBe('payments.deposit_exemption.granted')
  })

  it.each(['actorId', 'action', 'entityType', 'entityId'] as const)(
    'rechaza %s vacío',
    (field) => {
      const result = AuditEvent.create('evt-x', { ...validInput, [field]: '   ' })
      expect(isErr(result)).toBe(true)
    },
  )

  it('acumula todos los problemas encontrados', () => {
    const result = AuditEvent.create('evt-9', {
      ...validInput,
      action: '',
      entityType: '',
    })
    expect(isErr(result)).toBe(true)
    if (isOk(result)) return
    expect(result.error.problems).toHaveLength(2)
  })
})
