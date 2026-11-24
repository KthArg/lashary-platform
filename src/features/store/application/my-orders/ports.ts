import type { Result } from '@/shared/result'
import type { OrderState } from '../../domain/order'
import type { StoreStorageFailed } from '../../domain/order-errors'

export interface MyLatestOrder {
  readonly id: string
  readonly state: OrderState
  readonly totalColones: number
  readonly rejectionReason: string | null
  readonly createdAt: Date
}

export interface MyOrdersRepository {
  loadMostRecent(): Promise<Result<MyLatestOrder | null, StoreStorageFailed>>
}
