import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import { invalidCancellationWindow, storageFailed } from '../../../domain/errors'
import { MAX_CANCELLATION_WINDOW_HOURS } from '../../../domain/cancellation-window.constants'
import { CANCELLATION_WINDOW_FIELD, cancellationPolicyMessages } from '../constants/cancellation-policy-strings'
import { performChangeCancellationWindow, type ChangeWindowDeps } from '../utils/perform-change-window'

const copy = cancellationPolicyMessages
const fields = (hours: unknown) => ({ [CANCELLATION_WINDOW_FIELD]: hours })

function createDeps(overrides: Partial<ChangeWindowDeps> = {}) {
  const calls: number[] = []
  const deps: ChangeWindowDeps = {
    change: async (hours) => (calls.push(hours), ok(hours)),
    ...overrides,
  }
  return { deps, calls }
}

describe('performChangeCancellationWindow', () => {
  it('guarda la cifra como número y avisa cómo quedó la ventana', async () => {
    const { deps, calls } = createDeps()

    expect(await performChangeCancellationWindow(fields(' 24 '), deps)).toEqual({
      status: 'ok',
      message: copy.saved(24),
    })
    expect(calls).toEqual([24])
  })

  it.each([undefined, '', 'abc', '-1', '1.5', '2e3', 24])(
    'un valor que no es un entero (%s) se rechaza sin llamar a la base',
    async (raw) => {
      const { deps, calls } = createDeps()

      expect(await performChangeCancellationWindow(fields(raw), deps)).toEqual({
        status: 'invalid',
        message: copy.invalid(MAX_CANCELLATION_WINDOW_HOURS),
      })
      expect(calls).toEqual([])
    },
  )

  it('una cifra fuera del rango llega como inválida', async () => {
    const { deps } = createDeps({ change: async (hours) => err(invalidCancellationWindow(hours)) })

    expect(await performChangeCancellationWindow(fields('100000'), deps)).toEqual({
      status: 'invalid',
      message: copy.invalid(MAX_CANCELLATION_WINDOW_HOURS),
    })
  })

  it('un fallo de la base se avisa, sin decir que se guardó', async () => {
    const { deps } = createDeps({ change: async () => err(storageFailed('caída')) })

    expect(await performChangeCancellationWindow(fields('24'), deps)).toEqual({
      status: 'failed',
      message: copy.failed,
    })
  })
})
