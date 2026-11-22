import { isErr, ok, type Result } from '@/shared/result'
import type { DelinquencyStorageFailed } from '../domain/errors'
import type { QueueItem } from '../domain/regularization'
import type { ClientNamesPort, ReceiptLinks, RegularizationQueueRepository } from './ports'

export interface RegularizationQueue {
  readonly items: QueueItem[]
  readonly more: boolean
}

export type LoadRegularizationQueueDeps = {
  requests: RegularizationQueueRepository
  names: ClientNamesPort
  receipts: ReceiptLinks
}

export const loadRegularizationQueue =
  ({ requests, names, receipts }: LoadRegularizationQueueDeps) =>
  async (limit: number): Promise<Result<RegularizationQueue, DelinquencyStorageFailed>> => {
    const read = await requests.listPending(limit + 1)
    if (isErr(read)) return read
    const pending = read.value.slice(0, limit)
    if (pending.length === 0) return ok({ items: [], more: false })

    const nameMap = await names.namesFor([...new Set(pending.map((request) => request.clientId))])
    if (isErr(nameMap)) return nameMap

    const links = await receipts.signedUrls(pending.map((request) => request.receiptPath))
    const urlOf = (path: string): string | null => (isErr(links) ? null : (links.value.get(path) ?? null))

    return ok({
      items: pending.map((request) => ({
        ...request,
        clientName: nameMap.value.get(request.clientId) ?? null,
        receiptUrl: urlOf(request.receiptPath),
      })),
      more: read.value.length > limit,
    })
  }
