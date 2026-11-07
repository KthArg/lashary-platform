import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import { invalidConfirmationDeadline, storageFailed } from '@/features/scheduling/domain/errors'
import { MAX_CONFIRMATION_DEADLINE_HOURS } from '@/features/scheduling/domain/appointment-confirmation.constants'
import { CONFIRMATION_DEADLINE_FIELD, confirmationPolicyMessages } from '../constants/confirmation-policy-strings'
import { performChangeConfirmationDeadline, type ChangeDeadlineDeps } from '../utils/perform-change-deadline'

const copy = confirmationPolicyMessages
const fields = (hours: unknown) => ({ [CONFIRMATION_DEADLINE_FIELD]: hours })

function createDeps(overrides: Partial<ChangeDeadlineDeps> = {}) {
  const calls: number[] = []
  const deps: ChangeDeadlineDeps = {
    change: async (hours) => (calls.push(hours), ok(hours)),
    ...overrides,
  }
  return { deps, calls }
}

describe('performChangeConfirmationDeadline', () => {
  it('guarda la cifra como número y avisa cómo quedó el plazo', async () => {
    const { deps, calls } = createDeps()

    expect(await performChangeConfirmationDeadline(fields(' 24 '), deps)).toEqual({
      status: 'ok',
      message: copy.saved(24),
    })
    expect(calls).toEqual([24])
  })

  it.each([undefined, '', 'abc', '-1', '1.5', '2e3', 24])(
    'un valor que no es un entero (%s) se rechaza sin llamar a la base',
    async (raw) => {
      const { deps, calls } = createDeps()

      expect(await performChangeConfirmationDeadline(fields(raw), deps)).toEqual({
        status: 'invalid',
        message: copy.invalid(MAX_CONFIRMATION_DEADLINE_HOURS),
      })
      expect(calls).toEqual([])
    },
  )

  it('una cifra fuera del rango llega como inválida', async () => {
    const { deps } = createDeps({ change: async (hours) => err(invalidConfirmationDeadline(hours)) })

    expect(await performChangeConfirmationDeadline(fields('100000'), deps)).toEqual({
      status: 'invalid',
      message: copy.invalid(MAX_CONFIRMATION_DEADLINE_HOURS),
    })
  })

  it('un fallo de la base se avisa, sin decir que se guardó', async () => {
    const { deps } = createDeps({ change: async () => err(storageFailed('caída')) })

    expect(await performChangeConfirmationDeadline(fields('24'), deps)).toEqual({
      status: 'failed',
      message: copy.failed,
    })
  })
})
