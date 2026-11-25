import { isErr, ok, type Result } from '@/shared/result'
import type { StoreStorageFailed } from '../../domain/order-errors'
import type { OrderHistoryItem, OrderQueueItem, OrderReviewRepository, ReceiptLinks } from './ports'

export interface OrderQueueEntry extends OrderQueueItem {
  readonly receiptUrl: string | null
}

export interface OrderHistoryEntry extends OrderHistoryItem {
  readonly receiptUrl: string | null
}

export interface OrderHistoryEntryPage {
  readonly items: readonly OrderHistoryEntry[]
  readonly page: number
  readonly pageSize: number
  readonly total: number
}

export type LoadOrderQueueDeps = {
  requests: OrderReviewRepository
  receipts: ReceiptLinks
}

const withReceiptUrls = async <T extends { receiptPath: string }>(
  receipts: ReceiptLinks,
  items: readonly T[],
): Promise<Array<T & { receiptUrl: string | null }>> => {
  if (items.length === 0) return []
  const links = await receipts.signedUrls(items.map((item) => item.receiptPath))
  const urlOf = (path: string): string | null => (isErr(links) ? null : (links.value.get(path) ?? null))
  return items.map((item) => ({ ...item, receiptUrl: urlOf(item.receiptPath) }))
}

export const loadOrderQueue =
  ({ requests, receipts }: LoadOrderQueueDeps) =>
  async (limit: number): Promise<Result<OrderQueueEntry[], StoreStorageFailed>> => {
    const read = await requests.listPending(limit)
    if (isErr(read)) return read
    return ok(await withReceiptUrls(receipts, read.value))
  }

export const loadOrderHistory =
  ({ requests, receipts }: LoadOrderQueueDeps) =>
  async (page: number, pageSize: number): Promise<Result<OrderHistoryEntryPage, StoreStorageFailed>> => {
    const read = await requests.listHistory(page, pageSize)
    if (isErr(read)) return read
    const items = await withReceiptUrls(receipts, read.value.items)
    return ok({ items, page: read.value.page, pageSize: read.value.pageSize, total: read.value.total })
  }
