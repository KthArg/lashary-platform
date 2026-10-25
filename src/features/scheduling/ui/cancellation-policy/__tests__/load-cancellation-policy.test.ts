import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import { storageFailed } from '../../../domain/errors'
import { loadCancellationPolicy } from '../utils/load-cancellation-policy'

describe('loadCancellationPolicy', () => {
  it('con la ventana leída, la pantalla está lista con esas horas', async () => {
    expect(await loadCancellationPolicy({ getWindowHours: async () => ok(48) })).toEqual({
      status: 'ready',
      hours: 48,
    })
  })

  it('un fallo de la base es el estado error, nunca una cifra inventada', async () => {
    expect(await loadCancellationPolicy({ getWindowHours: async () => err(storageFailed('caída')) })).toEqual({
      status: 'error',
    })
  })
})
