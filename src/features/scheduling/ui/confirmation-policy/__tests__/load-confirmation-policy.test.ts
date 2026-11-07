import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import { storageFailed } from '@/features/scheduling/domain/errors'
import { loadConfirmationPolicy } from '../utils/load-confirmation-policy'

describe('loadConfirmationPolicy', () => {
  it('con el plazo leída, la pantalla está lista con esas horas', async () => {
    expect(await loadConfirmationPolicy({ getDeadlineHours: async () => ok(48) })).toEqual({
      status: 'ready',
      hours: 48,
    })
  })

  it('un fallo de la base es el estado error, nunca una cifra inventada', async () => {
    expect(await loadConfirmationPolicy({ getDeadlineHours: async () => err(storageFailed('caída')) })).toEqual({
      status: 'error',
    })
  })
})
