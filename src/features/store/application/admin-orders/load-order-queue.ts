import { isErr, ok, type Result } from '@/shared/result'
import type { StoreStorageFailed } from '../../domain/order-errors'
import type { OrderQueueItem, OrderReviewRepository, ReceiptLinks } from './ports'

export interface OrderQueueEntry extends OrderQueueItem {
  readonly receiptUrl: string | null
}

export type LoadOrderQueueDeps = {
  requests: OrderReviewRepository
  receipts: ReceiptLinks
}

export const loadOrderQueue =
  ({ requests, receipts }: LoadOrderQueueDeps) =>
  async (limit: number): Promise<Result<OrderQueueEntry[], StoreStorageFailed>> => {
    const read = await requests.listPending(limit)
    if (isErr(read)) return read
    if (read.value.length === 0) return ok([])

    const links = await receipts.signedUrls(read.value.map((order) => order.receiptPath))
    const urlOf = (path: string): string | null => (isErr(links) ? null : (links.value.get(path) ?? null))

    return ok(read.value.map((order) => ({ ...order, receiptUrl: urlOf(order.receiptPath) })))
  }
