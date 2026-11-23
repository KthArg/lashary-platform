import { isErr, type Result } from '@/shared/result'
import { validateRejectionReason } from '../../domain/order'
import type { InvalidRejectionReason } from '../../domain/order-errors'
import type { OrderQueueItem, OrderReviewRepository, ReviewOrderFailure } from './ports'

export const loadPendingOrders =
  (repo: OrderReviewRepository) =>
  (limit: number): Promise<Result<OrderQueueItem[], ReviewOrderFailure>> =>
    repo.listPending(limit)

export const approveOrder =
  (repo: OrderReviewRepository) =>
  (orderId: string): Promise<Result<void, ReviewOrderFailure>> =>
    repo.approve(orderId)

export const rejectOrder =
  (repo: OrderReviewRepository) =>
  async (orderId: string, reason: string): Promise<Result<void, ReviewOrderFailure | InvalidRejectionReason>> => {
    const validReason = validateRejectionReason(reason)
    if (isErr(validReason)) return validReason
    return repo.reject(orderId, validReason.value)
  }
