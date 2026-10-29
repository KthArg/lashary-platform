import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { invalidCancellationWindow, storageFailed } from '../../domain/errors'
import { changeCancellationWindow, getCancellationWindow } from '../cancellation-window'
import type { CancellationPolicyRepository } from '../ports'

const CURRENT_HOURS = 48

function createPolicy(overrides: Partial<CancellationPolicyRepository> = {}) {
  const changes: number[] = []
  const policy: CancellationPolicyRepository = {
    getWindowHours: async () => ok(CURRENT_HOURS),
    changeWindowHours: async (hours) => (changes.push(hours), ok({ previousHours: CURRENT_HOURS, newHours: hours })),
    ...overrides,
  }
  return { policy, changes }
}

describe('getCancellationWindow', () => {
  it('devuelve las horas vigentes', async () => {
    const { policy } = createPolicy()

    const result = await getCancellationWindow(policy)()

    expect(isOk(result) && result.value).toBe(CURRENT_HOURS)
  })

  it('un fallo de la base es StorageFailed, no un valor inventado', async () => {
    const { policy } = createPolicy({ getWindowHours: async () => err(storageFailed('caída')) })

    const result = await getCancellationWindow(policy)()

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})

describe('changeCancellationWindow', () => {
  it('manda la cifra a la base y devuelve cómo quedó la ventana', async () => {
    const { policy, changes } = createPolicy()

    const result = await changeCancellationWindow(policy)(24)

    expect(isOk(result) && result.value).toBe(24)
    expect(changes).toEqual([24])
  })

  it.each([-1, 1.5, 100000])('una cifra inválida (%s) no llega a la base', async (hours) => {
    const { policy, changes } = createPolicy()

    const result = await changeCancellationWindow(policy)(hours)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_INVALID_CANCELLATION_WINDOW')
    expect(changes).toEqual([])
  })

  it('si la base la rechaza por su tope, el error llega tipado', async () => {
    const { policy } = createPolicy({ changeWindowHours: async (hours) => err(invalidCancellationWindow(hours)) })

    const result = await changeCancellationWindow(policy)(24)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_INVALID_CANCELLATION_WINDOW')
  })

  it('un fallo de la base es StorageFailed, nunca un cambio dado por hecho', async () => {
    const { policy } = createPolicy({ changeWindowHours: async () => err(storageFailed('sin permiso')) })

    const result = await changeCancellationWindow(policy)(24)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
