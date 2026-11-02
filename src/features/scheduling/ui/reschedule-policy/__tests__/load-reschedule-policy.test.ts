import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import { storageFailed } from '../../../domain/errors'
import { loadReschedulePolicy } from '../utils/load-reschedule-policy'

const CURRENT_MAX = 1

describe('loadReschedulePolicy', () => {
  it('con el tope vigente, la pantalla queda lista con esa cifra', async () => {
    const screen = await loadReschedulePolicy({ getMaxReschedules: async () => ok(CURRENT_MAX) })

    expect(screen).toEqual({ status: 'ready', max: CURRENT_MAX })
  })

  it('si la base falla, la pantalla muestra el error y no inventa una cifra', async () => {
    const screen = await loadReschedulePolicy({ getMaxReschedules: async () => err(storageFailed('caída')) })

    expect(screen).toEqual({ status: 'error' })
  })
})
