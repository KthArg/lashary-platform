import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { loadOrderHistory } from '@/features/store/application/admin-orders/load-order-queue'
import { orderReviewRepository } from '@/features/store/db/order-review-repository'
import { receiptLinks } from '@/features/store/db/receipt-storage'
import { ORDER_HISTORY_PAGE_SIZE } from '../constants/order-queue-strings'
import type { HistoryViewModel } from '../types/order-review-results'

export const orderHistoryService = {
  async load(page: number): Promise<HistoryViewModel> {
    const db = await createClient()
    const repository = orderReviewRepository(db)
    const result = await loadOrderHistory({ requests: repository, receipts: receiptLinks(db) })(page, ORDER_HISTORY_PAGE_SIZE)
    return isErr(result) ? { status: 'error' } : { status: 'ready', ...result.value }
  },
}
