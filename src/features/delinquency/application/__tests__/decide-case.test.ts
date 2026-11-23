import { describe, it, expect, vi } from 'vitest'
import { ok, err, isOk, isErr } from '@/shared/result'
import { decideCase } from '../decide-case'
import type { CaseRepository } from '../ports'
import type { DelinquencyCase } from '../../domain/delinquency-case'
import { caseAlreadyDecided } from '../../domain/errors'

const CASE_ID = '7b0e5f8e-3c1a-4c55-9c1e-2f4a6b8d0e11'

const confirmed: DelinquencyCase = {
  id: CASE_ID,
  clientId: '1c9d1f0e-5a4b-4e0e-8d52-0d6a3e6f9a21',
  appointmentId: '2d7e2a1f-6b5c-4f1f-9e63-1e7b4f7a0b32',
  pending: 20000,
  state: 'active',
  detectedAt: new Date('2026-11-01T15:00:00Z'),
  decidedAt: new Date('2026-11-06T15:00:00Z'),
  exceptionReason: null,
  exceptionAmount: null,
}

const liftAndForgiveNotUsed = async (): Promise<never> => {
  throw new Error('decideCase no usa lift ni forgive')
}

describe('decideCase', () => {
  it('le pasa al repositorio la morosidad y la decisión tal cual y devuelve lo que decidió', async () => {
    const decide = vi.fn(async () => ok(confirmed))
    const repository: CaseRepository = { decide, lift: liftAndForgiveNotUsed, forgive: liftAndForgiveNotUsed }

    const result = await decideCase(repository)({ caseId: CASE_ID, decision: 'confirm' })

    expect(decide).toHaveBeenCalledWith(CASE_ID, 'confirm')
    expect(isOk(result) && result.value.state).toBe('active')
  })

  it('devuelve el error del repositorio sin esconderlo, por ejemplo una morosidad ya decidida', async () => {
    const repository: CaseRepository = {
      decide: async () => err(caseAlreadyDecided(CASE_ID)),
      lift: liftAndForgiveNotUsed,
      forgive: liftAndForgiveNotUsed,
    }

    const result = await decideCase(repository)({ caseId: CASE_ID, decision: 'dismiss' })

    expect(isErr(result)).toBe(true)
  })
})
