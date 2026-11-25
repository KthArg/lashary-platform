import type { Result } from '@/shared/result'
import type { DeliveryMethod, OrderLine, OrderState } from '../../domain/order'
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

export interface OrderHistoryItem extends OrderQueueItem {
  readonly state: OrderState
  readonly rejectionReason: string | null
  readonly reviewedAt: Date | null
}

export interface OrderHistoryPage {
  readonly items: readonly OrderHistoryItem[]
  readonly page: number
  readonly pageSize: number
  readonly total: number
}

export type ReviewOrderFailure = NotAdmin | OrderNotFound | OrderNotPending | StoreStorageFailed

export interface OrderReviewRepository {
  listPending(limit: number): Promise<Result<OrderQueueItem[], StoreStorageFailed>>
  listHistory(page: number, pageSize: number): Promise<Result<OrderHistoryPage, StoreStorageFailed>>
  approve(orderId: string): Promise<Result<void, ReviewOrderFailure>>
  reject(orderId: string, reason: string): Promise<Result<void, ReviewOrderFailure>>
}

export interface ReceiptLinks {
  signedUrls(paths: readonly string[]): Promise<Result<Map<string, string>, StoreStorageFailed>>
}
