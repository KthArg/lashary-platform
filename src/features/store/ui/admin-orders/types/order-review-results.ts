import type { OrderQueueEntry } from '@/features/store/application/admin-orders/load-order-queue'

export type OrderReviewActionResult = { ok: true; message: string } | { ok: false; message: string }

export type QueueViewModel = { status: 'error' } | { status: 'ready'; orders: OrderQueueEntry[] }
