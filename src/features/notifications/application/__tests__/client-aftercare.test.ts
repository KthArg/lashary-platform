import { describe, it, expect } from 'vitest'
import { ok, err, isOk, isErr } from '@/shared/result'
import { MY_AFTERCARE_PAGE_SIZE } from '../../domain/aftercare-message'
import { aftercareStorageFailed } from '../../domain/errors'
import { loadClientAftercare } from '../client-aftercare'

describe('loadClientAftercare', () => {
  it('pide al repositorio una página del tamaño acordado y devuelve lo que lee', async () => {
    const requestedLimits: number[] = []
    const repository = {
      listRecent: async (limit: number) => (requestedLimits.push(limit), ok([])),
    }

    const result = await loadClientAftercare({ repository })()

    expect(requestedLimits).toEqual([MY_AFTERCARE_PAGE_SIZE])
    expect(isOk(result) && result.value).toEqual([])
  })

  it('un fallo del repositorio llega como error, no como lista vacía', async () => {
    const repository = { listRecent: async () => err(aftercareStorageFailed('caída')) }
    expect(isErr(await loadClientAftercare({ repository })())).toBe(true)
  })
})
