import type { OrderHistoryEntry, OrderQueueEntry } from '@/features/store/application/admin-orders/load-order-queue'

export type OrderReviewActionResult = { ok: true; message: string } | { ok: false; message: string }

export type QueueViewModel = { status: 'error' } | { status: 'ready'; orders: OrderQueueEntry[] }

export type HistoryViewModel =
  | { status: 'error' }
  | { status: 'ready'; items: readonly OrderHistoryEntry[]; page: number; pageSize: number; total: number }
