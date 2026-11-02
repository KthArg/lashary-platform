import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import { invalidRescheduleLimit, storageFailed } from '../../../domain/errors'
import { MAX_RESCHEDULE_LIMIT } from '../../../domain/reschedule-limit.constants'
import { RESCHEDULE_LIMIT_FIELD, reschedulePolicyMessages } from '../constants/reschedule-policy-strings'
import { performChangeRescheduleLimit, type ChangeLimitDeps } from '../utils/perform-change-limit'

const INVALID_STATE = { status: 'invalid', message: reschedulePolicyMessages.invalid(MAX_RESCHEDULE_LIMIT) }

function createDeps(overrides: Partial<ChangeLimitDeps> = {}) {
  const changes: number[] = []
  const deps: ChangeLimitDeps = {
    change: async (max) => (changes.push(max), ok(max)),
    ...overrides,
  }
  return { deps, changes }
}

describe('performChangeRescheduleLimit', () => {
  it('guarda la cifra escrita y avisa cómo quedó el tope', async () => {
    const { deps, changes } = createDeps()
    const state = await performChangeRescheduleLimit({ [RESCHEDULE_LIMIT_FIELD]: ' 2 ' }, deps)

    expect(state).toEqual({ status: 'ok', message: reschedulePolicyMessages.saved(2) })
    expect(changes).toEqual([2])
  })

  it('con 0 avisa que reagendar quedó desactivado', async () => {
    const { deps } = createDeps()
    const state = await performChangeRescheduleLimit({ [RESCHEDULE_LIMIT_FIELD]: '0' }, deps)

    expect(state).toEqual({ status: 'ok', message: reschedulePolicyMessages.saved(0) })
  })

  it.each([
    ['vacío', ''],
    ['con decimales', '1.5'],
    ['negativo', '-1'],
    ['con letras', 'dos'],
    ['sin campo', undefined],
  ])('un valor %s se rechaza antes de llegar a la base', async (_label, value) => {
    const { deps, changes } = createDeps()
    const state = await performChangeRescheduleLimit({ [RESCHEDULE_LIMIT_FIELD]: value }, deps)

    expect(state).toEqual(INVALID_STATE)
    expect(changes).toEqual([])
  })

  it('un número fuera de rango lo rechaza el caso de uso y llega como estado inválido', async () => {
    const { deps } = createDeps({ change: async (max) => err(invalidRescheduleLimit(max)) })
    const state = await performChangeRescheduleLimit({ [RESCHEDULE_LIMIT_FIELD]: '11' }, deps)

    expect(state).toEqual(INVALID_STATE)
  })

  it('un fallo de la base llega como mensaje, sin lanzar', async () => {
    const { deps } = createDeps({ change: async () => err(storageFailed('caída')) })
    const state = await performChangeRescheduleLimit({ [RESCHEDULE_LIMIT_FIELD]: '2' }, deps)

    expect(state).toEqual({ status: 'failed', message: reschedulePolicyMessages.failed })
  })
})
