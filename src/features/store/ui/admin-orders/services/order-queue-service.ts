import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { loadOrderQueue } from '@/features/store/application/admin-orders/load-order-queue'
import { orderReviewRepository } from '@/features/store/db/order-review-repository'
import { receiptLinks } from '@/features/store/db/receipt-storage'
import { QUEUE_LIMIT } from '../constants/order-queue-strings'
import type { QueueViewModel } from '../types/order-review-results'

export const orderQueueService = {
  async load(): Promise<QueueViewModel> {
    const db = await createClient()
    const repository = orderReviewRepository(db)
    const result = await loadOrderQueue({ requests: repository, receipts: receiptLinks(db) })(QUEUE_LIMIT)
    return isErr(result) ? { status: 'error' } : { status: 'ready', orders: result.value }
  },
}
