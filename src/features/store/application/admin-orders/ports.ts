import type { Result } from '@/shared/result'
import type { DeliveryMethod, OrderLine } from '../../domain/order'
import type { NotAdmin, OrderNotFound, OrderNotPending, StoreStorageFailed } from '../../domain/order-errors'

export interface OrderQueueItem {
  readonly id: string
  readonly clientId: string
  readonly clientName: string | null
  readonly contactPhone: string
  readonly deliveryMethod: DeliveryMethod
  readonly deliveryAddress: string | null
  readonly totalColones: number
  readonly receiptPath: string
  readonly createdAt: Date
  readonly lines: readonly OrderLine[]
}

export type ReviewOrderFailure = NotAdmin | OrderNotFound | OrderNotPending | StoreStorageFailed

export interface OrderReviewRepository {
  listPending(limit: number): Promise<Result<OrderQueueItem[], StoreStorageFailed>>
  approve(orderId: string): Promise<Result<void, ReviewOrderFailure>>
  reject(orderId: string, reason: string): Promise<Result<void, ReviewOrderFailure>>
}

export interface ReceiptLinks {
  signedUrls(paths: readonly string[]): Promise<Result<Map<string, string>, StoreStorageFailed>>
}
