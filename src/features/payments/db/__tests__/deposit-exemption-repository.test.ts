import { describe, it, expect } from 'vitest'
import { isOk } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { DepositExemption } from '@/features/payments/domain/deposit-exemption'
import { toRow } from '../deposit-exemption-repository'

describe('toRow', () => {
  it('mapea la exoneración de dominio a la fila que espera payments_deposit_exemptions', () => {
    const built = DepositExemption.create('exm-1', {
      clientId: '00000000-0000-0000-0000-0000000000c1',
      exemptedBy: '00000000-0000-0000-0000-0000000000a1',
      reason: 'caso especial',
      createdAt: fixedDate('2026-09-24T10:00:00Z'),
    })
    expect(isOk(built)).toBe(true)
    if (!isOk(built)) return

    expect(toRow(built.value)).toEqual({
      id: 'exm-1',
      client_id: '00000000-0000-0000-0000-0000000000c1',
      exempted_by: '00000000-0000-0000-0000-0000000000a1',
      reason: 'caso especial',
      active: true,
      created_at: '2026-09-24T10:00:00.000Z',
    })
  })
})
