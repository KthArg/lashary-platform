import type { Result } from '@/shared/result'
import type { DeliveryMethod } from '../../domain/order'
import type {
  CartEmpty,
  InsufficientStock,
  NotAClient,
  ReceiptAlreadyUsed,
  ReceiptNotFound,
  StoreStorageFailed,
} from '../../domain/order-errors'

export interface ReceiptFile {
  readonly bytes: Uint8Array
  readonly contentType: string
}

export interface ReceiptStorage {
  upload(path: string, file: ReceiptFile): Promise<Result<void, StoreStorageFailed>>
}

export interface CurrentClientPort {
  currentClientId(): Promise<Result<string | null, StoreStorageFailed>>
}

export type CheckoutRefusal =
  | NotAClient
  | CartEmpty
  | InsufficientStock
  | ReceiptNotFound
  | ReceiptAlreadyUsed
  | StoreStorageFailed

export interface CheckoutRequest {
  readonly contactPhone: string
  readonly deliveryMethod: DeliveryMethod
  readonly deliveryAddress: string | null
  readonly receiptPath: string
}

export interface CheckoutRepository {
  checkout(input: CheckoutRequest): Promise<Result<string, CheckoutRefusal>>
}
