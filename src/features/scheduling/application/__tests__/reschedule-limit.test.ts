import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { MAX_RESCHEDULE_LIMIT } from '../../domain/reschedule-limit.constants'
import { storageFailed } from '../../domain/errors'
import { changeRescheduleLimit, getRescheduleLimit } from '../reschedule-limit'
import type { ReschedulePolicyRepository } from '../ports'

const CURRENT_MAX = 1

function createPolicy(overrides: Partial<ReschedulePolicyRepository> = {}) {
  const changes: number[] = []
  const policy: ReschedulePolicyRepository = {
    getMaxReschedules: async () => ok(CURRENT_MAX),
    changeMaxReschedules: async (max) => (changes.push(max), ok({ previousMax: CURRENT_MAX, newMax: max })),
    ...overrides,
  }
  return { policy, changes }
}

describe('getRescheduleLimit', () => {
  it('devuelve el tope vigente', async () => {
    const { policy } = createPolicy()

    const result = await getRescheduleLimit(policy)()

    expect(isOk(result) && result.value).toBe(CURRENT_MAX)
  })

  it('un fallo de la base es StorageFailed, no un valor inventado', async () => {
    const { policy } = createPolicy({ getMaxReschedules: async () => err(storageFailed('caída')) })

    const result = await getRescheduleLimit(policy)()

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})

describe('changeRescheduleLimit', () => {
  it('manda la cifra a la base y devuelve cómo quedó el tope', async () => {
    const { policy, changes } = createPolicy()

    const result = await changeRescheduleLimit(policy)(MAX_RESCHEDULE_LIMIT)

    expect(isOk(result) && result.value).toBe(MAX_RESCHEDULE_LIMIT)
    expect(changes).toEqual([MAX_RESCHEDULE_LIMIT])
  })

  it('una cifra fuera de rango ni siquiera llega a la base', async () => {
    const { policy, changes } = createPolicy()

    const result = await changeRescheduleLimit(policy)(MAX_RESCHEDULE_LIMIT + 1)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_INVALID_RESCHEDULE_LIMIT')
    expect(changes).toEqual([])
  })

  it('un fallo de la base llega como error tipado, sin lanzar', async () => {
    const { policy } = createPolicy({ changeMaxReschedules: async () => err(storageFailed('caída')) })

    const result = await changeRescheduleLimit(policy)(2)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
