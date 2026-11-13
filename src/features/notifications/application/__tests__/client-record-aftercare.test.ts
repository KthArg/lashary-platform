import { describe, it, expect } from 'vitest'
import { ok, isOk, isErr } from '@/shared/result'
import { CLIENT_RECORD_AFTERCARE_PAGE_SIZE } from '../../domain/aftercare-message'
import { isAftercareStorageFailed } from '../../domain/errors'
import { loadClientRecordAftercare } from '../client-record-aftercare'

const CLIENT_ID = '3f2b8c1e-5d4a-4e7b-9a10-2c6d8e0f1a23'

function createFakeRepository() {
  const requests: Array<{ clientId: string; limit: number }> = []
  const repository = {
    listForClient: async (clientId: string, limit: number) => (requests.push({ clientId, limit }), ok([])),
  }
  return { repository, requests }
}

describe('loadClientRecordAftercare', () => {
  it('pide al repositorio la clienta indicada con la página acordada', async () => {
    const { repository, requests } = createFakeRepository()

    const result = await loadClientRecordAftercare({ repository })(CLIENT_ID)

    expect(requests).toEqual([{ clientId: CLIENT_ID, limit: CLIENT_RECORD_AFTERCARE_PAGE_SIZE }])
    expect(isOk(result) && result.value).toEqual([])
  })

  it('un identificador que no es uuid es un error y no consulta', async () => {
    const { repository, requests } = createFakeRepository()

    const result = await loadClientRecordAftercare({ repository })('no-es-un-uuid')

    expect(isErr(result) && isAftercareStorageFailed(result.error)).toBe(true)
    expect(requests).toEqual([])
  })
})
