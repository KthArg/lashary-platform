import { describe, it, expect } from 'vitest'
import { ok, err, isErr, isOk } from '@/shared/result'
import { delinquencyStorageFailed } from '../../domain/errors'
import { detectUnpaid } from '../detect-unpaid'
import type { DetectionRepository } from '../ports'

describe('detectUnpaid', () => {
  it('informa cuántas morosidades por revisar generó la corrida', async () => {
    const repository: DetectionRepository = { detectUnpaid: async () => ok(3) }

    const result = await detectUnpaid(repository)()

    expect(isOk(result) && result.value).toEqual({ generated: 3 })
  })

  it('sin nada nuevo que detectar informa cero, no un error', async () => {
    const repository: DetectionRepository = { detectUnpaid: async () => ok(0) }

    const result = await detectUnpaid(repository)()

    expect(isOk(result) && result.value).toEqual({ generated: 0 })
  })

  it('devuelve el fallo de la base tal cual', async () => {
    const failure = delinquencyStorageFailed('boom')
    const repository: DetectionRepository = { detectUnpaid: async () => err(failure) }

    const result = await detectUnpaid(repository)()

    expect(isErr(result) && result.error).toBe(failure)
  })
})
