'use server'

import { revalidatePath } from 'next/cache'
import { ORDER_REVIEW_FIELDS, ORDERS_ADMIN_PATH } from '../constants/order-queue-strings'
import { orderReviewService } from '../services/order-review-service'
import type { OrderReviewActionResult } from '../types/order-review-results'

export async function approveOrderAction(
  _previous: OrderReviewActionResult | null,
  formData: FormData,
): Promise<OrderReviewActionResult> {
  const result = await orderReviewService.approve({ orderId: formData.get(ORDER_REVIEW_FIELDS.orderId) })
  if (result.ok) revalidatePath(ORDERS_ADMIN_PATH)
  return result
}

export async function rejectOrderAction(
  _previous: OrderReviewActionResult | null,
  formData: FormData,
): Promise<OrderReviewActionResult> {
  const result = await orderReviewService.reject({
    orderId: formData.get(ORDER_REVIEW_FIELDS.orderId),
    reason: formData.get(ORDER_REVIEW_FIELDS.reason),
  })
  if (result.ok) revalidatePath(ORDERS_ADMIN_PATH)
  return result
}
