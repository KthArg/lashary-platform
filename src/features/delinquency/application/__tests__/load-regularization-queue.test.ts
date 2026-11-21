import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { delinquencyStorageFailed } from '../../domain/errors'
import type { PendingRegularization } from '../../domain/regularization'
import { loadRegularizationQueue } from '../load-regularization-queue'
import type { ClientNamesPort, ReceiptLinks, RegularizationQueueRepository } from '../ports'

const request = (n: number): PendingRegularization => ({
  requestId: `solicitud-${n}`,
  caseId: `morosidad-${n}`,
  clientId: n % 2 ? 'clienta-a' : 'clienta-b',
  declaredAmount: 10000,
  reference: null,
  receiptPath: `clienta/${n}.pdf`,
  pendingToday: 25000,
  submittedAt: new Date('2026-11-10T15:00:00Z'),
})

function deps(options: { rows?: PendingRegularization[]; links?: Awaited<ReturnType<ReceiptLinks['signedUrls']>> } = {}) {
  const asked: { limit?: number; names?: string[]; paths?: readonly string[] } = {}
  const requests: RegularizationQueueRepository = {
    async listPending(limit) {
      asked.limit = limit
      return ok(options.rows ?? [request(1), request(2)])
    },
  }
  const names: ClientNamesPort = {
    async namesFor(ids) {
      asked.names = ids
      return ok(new Map([['clienta-a', 'Ana']]))
    },
  }
  const receipts: ReceiptLinks = {
    async signedUrls(paths) {
      asked.paths = paths
      return options.links ?? ok(new Map(paths.map((path) => [path, `https://firmado/${path}`])))
    },
  }
  return { deps: { requests, names, receipts }, asked }
}

describe('loadRegularizationQueue', () => {
  it('trae las pendientes con el nombre de la clienta y el enlace firmado de cada comprobante', async () => {
    const { deps: d, asked } = deps()
    const result = await loadRegularizationQueue(d)(50)

    expect(asked.limit).toBe(51)
    expect(asked.names).toEqual(['clienta-a', 'clienta-b'])
    expect(isOk(result) && result.value.items.map((i) => [i.requestId, i.clientName, i.receiptUrl])).toEqual([
      ['solicitud-1', 'Ana', 'https://firmado/clienta/1.pdf'],
      ['solicitud-2', null, 'https://firmado/clienta/2.pdf'],
    ])
    expect(isOk(result) && result.value.more).toBe(false)
  })

  it('pide una de más para saber si hay más de las que se muestran', async () => {
    const { deps: d } = deps({ rows: [request(1), request(2), request(3)] })
    const result = await loadRegularizationQueue(d)(2)

    expect(isOk(result) && [result.value.items.length, result.value.more]).toEqual([2, true])
  })

  it('si no se pueden firmar los enlaces, la cola sale igual, sin enlace', async () => {
    const { deps: d } = deps({ links: err(delinquencyStorageFailed('storage caído')) })
    const result = await loadRegularizationQueue(d)(50)

    expect(isOk(result) && result.value.items.map((i) => i.receiptUrl)).toEqual([null, null])
  })

  it('sin pendientes no pide nombres ni enlaces', async () => {
    const { deps: d, asked } = deps({ rows: [] })
    const result = await loadRegularizationQueue(d)(50)

    expect(isOk(result) && result.value.items).toEqual([])
    expect([asked.names, asked.paths]).toEqual([undefined, undefined])
  })

  it('un fallo al leer la cola es un fallo, no una cola vacía', async () => {
    const { deps: d } = deps()
    const failing = { ...d, requests: { listPending: async () => err(delinquencyStorageFailed('caída')) } }
    const result = await loadRegularizationQueue(failing)(50)

    expect(isErr(result) && result.error.code).toBe('DELINQUENCY_STORAGE_FAILED')
  })
})
