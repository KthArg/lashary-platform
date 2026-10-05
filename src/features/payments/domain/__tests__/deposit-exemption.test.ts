import { describe, it, expect } from 'vitest'
import { isOk, isErr } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { DepositExemption } from '../deposit-exemption'

const validInput = {
  clientId: '00000000-0000-0000-0000-0000000000c1',
  exemptedBy: '00000000-0000-0000-0000-0000000000a1',
  reason: 'caso especial aprobado por la dueña',
  createdAt: fixedDate('2026-09-24T10:00:00Z'),
}

describe('DepositExemption.create', () => {
  it('crea una exoneración válida, siempre activa', () => {
    const result = DepositExemption.create('exm-1', validInput)
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return

    expect(result.value.id).toBe('exm-1')
    expect(result.value.clientId).toBe(validInput.clientId)
    expect(result.value.exemptedBy).toBe(validInput.exemptedBy)
    expect(result.value.reason).toBe(validInput.reason)
    expect(result.value.active).toBe(true)
    expect(result.value.createdAt).toEqual(validInput.createdAt)
  })

  it('recorta espacios en los campos de texto', () => {
    const result = DepositExemption.create('exm-2', {
      ...validInput,
      reason: '  caso especial  ',
    })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.reason).toBe('caso especial')
  })

  it.each(['clientId', 'exemptedBy', 'reason'] as const)('rechaza %s vacío', (field) => {
    const result = DepositExemption.create('exm-x', { ...validInput, [field]: '   ' })
    expect(isErr(result)).toBe(true)
  })

  it('acumula todos los problemas encontrados', () => {
    const result = DepositExemption.create('exm-3', {
      ...validInput,
      clientId: '',
      reason: '',
    })
    expect(isErr(result)).toBe(true)
    if (isOk(result)) return
    expect(result.error.problems).toHaveLength(2)
  })
})
