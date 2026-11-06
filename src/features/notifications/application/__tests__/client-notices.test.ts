import { describe, it, expect } from 'vitest'
import { ok } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { CLIENT_NOTICES_LIMIT } from '../../domain/client-notice'
import { loadClientNotices } from '../client-notices'
import type { ClientNoticesRepository } from '../ports'

describe('loadClientNotices', () => {
  it('pide los avisos vigentes desde la hora del reloj, con el tope de la pantalla (DOM-004)', async () => {
    const calls: [Date, number][] = []
    const repository: ClientNoticesRepository = {
      async listKeptFrom(now, limit) {
        calls.push([now, limit])
        return ok([])
      },
    }
    const clock = fixedClock('2047-10-02T12:00:00Z')

    await loadClientNotices({ repository, clock })()

    expect(calls).toEqual([[fixedDate('2047-10-02T12:00:00Z'), CLIENT_NOTICES_LIMIT]])
  })
})
