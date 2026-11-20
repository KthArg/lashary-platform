import { describe, it, expect, vi } from 'vitest'
import { ok, err, isOk, isErr } from '@/shared/result'
import { forgiveCase } from '../forgive-case'
import type { CaseRepository } from '../ports'
import type { DelinquencyCase } from '../../domain/delinquency-case'
import { invalidForgiveAmount } from '../../domain/errors'

const CASE_ID = '7b0e5f8e-3c1a-4c55-9c1e-2f4a6b8d0e11'

const partiallyForgiven: DelinquencyCase = {
  id: CASE_ID,
  clientId: '1c9d1f0e-5a4b-4e0e-8d52-0d6a3e6f9a21',
  appointmentId: '2d7e2a1f-6b5c-4f1f-9e63-1e7b4f7a0b32',
  pending: 12000,
  state: 'active',
  detectedAt: new Date('2026-11-01T15:00:00Z'),
  decidedAt: new Date('2026-11-10T15:00:00Z'),
  exceptionReason: 'buena clienta',
  exceptionAmount: 4000,
}

const decideAndLiftNotUsed = async (): Promise<never> => {
  throw new Error('forgiveCase no usa decide ni lift')
}

describe('forgiveCase', () => {
  it('le pasa al repositorio el caso, el monto y el motivo tal cual y devuelve el caso devuelto', async () => {
    const forgive = vi.fn(async () => ok(partiallyForgiven))
    const repository: CaseRepository = { decide: decideAndLiftNotUsed, lift: decideAndLiftNotUsed, forgive }

    const result = await forgiveCase(repository)({ caseId: CASE_ID, amount: 4000, reason: 'buena clienta' })

    expect(forgive).toHaveBeenCalledWith(CASE_ID, 4000, 'buena clienta')
    expect(isOk(result) && result.value.state).toBe('active')
    expect(isOk(result) && result.value.exceptionAmount).toBe(4000)
  })

  it('devuelve el error del repositorio sin esconderlo, por ejemplo un monto fuera de rango', async () => {
    const repository: CaseRepository = {
      decide: decideAndLiftNotUsed,
      lift: decideAndLiftNotUsed,
      forgive: async () => err(invalidForgiveAmount()),
    }

    const result = await forgiveCase(repository)({ caseId: CASE_ID, amount: 999999, reason: 'motivo' })

    expect(isErr(result)).toBe(true)
  })
})
