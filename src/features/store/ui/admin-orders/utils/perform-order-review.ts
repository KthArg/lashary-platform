import { z } from 'zod'
import type { Result } from '@/shared/result'
import type { ReviewOrderFailure } from '@/features/store/application/admin-orders/ports'
import type { InvalidRejectionReason } from '@/features/store/domain/order-errors'
import { orderDecisionMessages, orderReviewRefusalMessages } from '../constants/order-queue-strings'
import type { OrderReviewActionResult } from '../types/order-review-results'

export type OrderReviewDeps = {
  approve: (orderId: string) => Promise<Result<void, ReviewOrderFailure>>
  reject: (orderId: string, reason: string) => Promise<Result<void, ReviewOrderFailure | InvalidRejectionReason>>
}

const orderIdSchema = z.string().guid()

function messageFor(error: ReviewOrderFailure | InvalidRejectionReason): string {
  switch (error.code) {
    case 'STORE_PEDIDO_NO_ENCONTRADO':
      return orderReviewRefusalMessages['order-not-found']
    case 'STORE_PEDIDO_NO_PENDIENTE':
      return orderReviewRefusalMessages['order-not-pending']
    case 'STORE_PEDIDO_MOTIVO_RECHAZO_INVALIDO':
      return orderReviewRefusalMessages['rejection-reason-required']
    default:
      return orderDecisionMessages.saveFailed
  }
}

export async function performApproveOrder(fields: { orderId: unknown }, deps: OrderReviewDeps): Promise<OrderReviewActionResult> {
  const orderId = orderIdSchema.safeParse(fields.orderId)
  if (!orderId.success) return { ok: false, message: orderDecisionMessages.invalidInput }

  const approved = await deps.approve(orderId.data)
  if (!approved.ok) return { ok: false, message: messageFor(approved.error) }
  return { ok: true, message: orderDecisionMessages.approved }
}

export async function performRejectOrder(
  fields: { orderId: unknown; reason: unknown },
  deps: OrderReviewDeps,
): Promise<OrderReviewActionResult> {
  const orderId = orderIdSchema.safeParse(fields.orderId)
  if (!orderId.success) return { ok: false, message: orderDecisionMessages.invalidInput }
  if (typeof fields.reason !== 'string') return { ok: false, message: orderReviewRefusalMessages['rejection-reason-required'] }

  const rejected = await deps.reject(orderId.data, fields.reason)
  if (!rejected.ok) return { ok: false, message: messageFor(rejected.error) }
  return { ok: true, message: orderDecisionMessages.rejected }
}
