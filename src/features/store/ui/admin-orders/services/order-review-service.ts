import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { approveOrder, rejectOrder } from '@/features/store/application/admin-orders/review-order'
import { orderReviewRepository } from '@/features/store/db/order-review-repository'
import { performApproveOrder, performRejectOrder, type OrderReviewDeps } from '../utils/perform-order-review'
import type { OrderReviewActionResult } from '../types/order-review-results'

async function createDeps(): Promise<OrderReviewDeps> {
  await requireAdminSession()
  const repository = orderReviewRepository(await createClient())
  return { approve: approveOrder(repository), reject: rejectOrder(repository) }
}

export const orderReviewService = {
  async approve(fields: { orderId: unknown }): Promise<OrderReviewActionResult> {
    return performApproveOrder(fields, await createDeps())
  },

  async reject(fields: { orderId: unknown; reason: unknown }): Promise<OrderReviewActionResult> {
    return performRejectOrder(fields, await createDeps())
  },
}
