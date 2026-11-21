import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { reviewRefused } from '../../domain/errors'
import { REJECTION_REASON_MAX_LENGTH } from '../../domain/regularization'
import { approveRegularization, rejectRegularization } from '../review-regularization'
import type { RegularizationReviewRepository } from '../ports'

function createRepository(overrides: Partial<RegularizationReviewRepository> = {}) {
  const calls: unknown[][] = []
  const repository: RegularizationReviewRepository = {
    async approve(requestId, amount) {
      calls.push(['approve', requestId, amount])
      return ok('settled')
    },
    async reject(requestId, reason) {
      calls.push(['reject', requestId, reason])
      return ok(undefined)
    },
    ...overrides,
  }
  return { repository, calls }
}

describe('approveRegularization', () => {
  it('aprueba con el monto que decidió la administradora y devuelve el estado de la morosidad', async () => {
    const { repository, calls } = createRepository()
    const result = await approveRegularization(repository)({ requestId: 'solicitud-1', approvedAmount: 8000 })

    expect(isOk(result) && result.value).toBe('settled')
    expect(calls).toEqual([['approve', 'solicitud-1', 8000]])
  })

  it.each([[0], [-1], [10.5], [Number.NaN]])('un monto de %s no llega a la base', async (approvedAmount) => {
    const { repository, calls } = createRepository()
    const result = await approveRegularization(repository)({ requestId: 'solicitud-1', approvedAmount })

    expect(isErr(result) && result.error).toMatchObject({ reason: 'approved-amount-invalid' })
    expect(calls).toEqual([])
  })

  it('lo que rechaza la base llega con su motivo', async () => {
    const { repository } = createRepository({ approve: async () => err(reviewRefused('request-not-pending')) })
    const result = await approveRegularization(repository)({ requestId: 'solicitud-1', approvedAmount: 8000 })

    expect(isErr(result) && result.error).toMatchObject({ reason: 'request-not-pending' })
  })
})

describe('rejectRegularization', () => {
  it('rechaza con el motivo sin espacios sobrantes', async () => {
    const { repository, calls } = createRepository()
    const result = await rejectRegularization(repository)({ requestId: 'solicitud-1', reason: '  No se lee el monto  ' })

    expect(isOk(result)).toBe(true)
    expect(calls).toEqual([['reject', 'solicitud-1', 'No se lee el monto']])
  })

  it.each([[''], ['   '], ['  Ilegible.  '], ['x'.repeat(REJECTION_REASON_MAX_LENGTH + 1)]])('un motivo vacío, de menos de 10 caracteres o demasiado largo no llega a la base', async (reason) => {
    const { repository, calls } = createRepository()
    const result = await rejectRegularization(repository)({ requestId: 'solicitud-1', reason })

    expect(isErr(result) && result.error).toMatchObject({ reason: 'rejection-reason-required' })
    expect(calls).toEqual([])
  })
})
