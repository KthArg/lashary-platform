import { describe, it, expect, vi } from 'vitest'
import { ok, err, isOk, isErr } from '@/shared/result'
import { liftCase } from '../lift-case'
import type { CaseRepository } from '../ports'
import type { DelinquencyCase } from '../../domain/delinquency-case'
import { caseNotActive } from '../../domain/errors'

const CASE_ID = '7b0e5f8e-3c1a-4c55-9c1e-2f4a6b8d0e11'

const lifted: DelinquencyCase = {
  id: CASE_ID,
  clientId: '1c9d1f0e-5a4b-4e0e-8d52-0d6a3e6f9a21',
  appointmentId: '2d7e2a1f-6b5c-4f1f-9e63-1e7b4f7a0b32',
  pending: 12000,
  state: 'lifted',
  detectedAt: new Date('2026-11-01T15:00:00Z'),
  decidedAt: new Date('2026-11-10T15:00:00Z'),
  exceptionReason: 'error de registro',
  exceptionAmount: null,
}

const notUsed = async (): Promise<never> => {
  throw new Error('no debería llamarse en estas pruebas')
}

describe('liftCase', () => {
  it('le pasa al repositorio el caso y el motivo tal cual y devuelve el caso levantado', async () => {
    const lift = vi.fn(async () => ok(lifted))
    const repository: CaseRepository = { decide: notUsed, lift, forgive: notUsed }

    const result = await liftCase(repository)({ caseId: CASE_ID, reason: 'error de registro' })

    expect(lift).toHaveBeenCalledWith(CASE_ID, 'error de registro')
    expect(isOk(result) && result.value.state).toBe('lifted')
  })

  it('devuelve el error del repositorio sin esconderlo, por ejemplo un caso que no está active', async () => {
    const repository: CaseRepository = { decide: notUsed, lift: async () => err(caseNotActive(CASE_ID)), forgive: notUsed }

    const result = await liftCase(repository)({ caseId: CASE_ID, reason: 'motivo' })

    expect(isErr(result)).toBe(true)
  })
})
