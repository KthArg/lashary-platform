import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { moneyFromColones } from '@/shared/money'
import { err, isErr, ok } from '@/shared/result'
import { DELIVERY_METHODS, ORDER_STATES } from '../domain/order'
import {
  createNotAdmin,
  createOrderNotFound,
  createOrderNotPending,
  createStoreStorageFailed,
} from '../domain/order-errors'
import type { OrderHistoryItem, OrderQueueItem, OrderReviewRepository, ReviewOrderFailure } from '../application/admin-orders/ports'

export const ORDERS_TABLE = 'store_orders'
export const APPROVE_FUNCTION = 'store_approve_order'
export const REJECT_FUNCTION = 'store_reject_order'
export const CLIENT_NAMES_FUNCTION = 'clients_display_names'

const UNEXPECTED_ROW = 'la base devolvió una fila con una forma inesperada'

const QUEUE_COLUMNS =
  'id, client_id, contact_phone, delivery_method, delivery_address, total_crc, receipt_path, created_at, ' +
  'store_order_items(product_id, product_name, unit_price_crc, quantity)'

const queueRowSchema = z.object({
  id: z.string().guid(),
  client_id: z.string().guid(),
  contact_phone: z.string(),
  delivery_method: z.enum(DELIVERY_METHODS),
  delivery_address: z.string().nullable(),
  total_crc: z.union([z.number(), z.string()]),
  receipt_path: z.string(),
  created_at: z.string(),
  store_order_items: z.array(
    z.object({
      product_id: z.string().guid(),
      product_name: z.string(),
      unit_price_crc: z.number().int(),
      quantity: z.number().int(),
    }),
  ),
})

const HISTORY_COLUMNS = `${QUEUE_COLUMNS}, state, rejection_reason, reviewed_at`

const historyRowSchema = queueRowSchema.extend({
  state: z.enum(ORDER_STATES),
  rejection_reason: z.string().nullable(),
  reviewed_at: z.string().nullable(),
})

const nameRowSchema = z.object({ client_id: z.string().uuid(), full_name: z.string() })

async function namesByClientId(db: SupabaseClient, clientIds: readonly string[]) {
  const names = await db.rpc(CLIENT_NAMES_FUNCTION, { p_client_ids: clientIds })
  if (names.error) return err(createStoreStorageFailed(names.error.message))
  const parsedNames = z.array(nameRowSchema).safeParse(names.data ?? [])
  if (!parsedNames.success) return err(createStoreStorageFailed(UNEXPECTED_ROW))
  return ok(new Map(parsedNames.data.map((row) => [row.client_id, row.full_name])))
}

function toQueueItem(row: z.infer<typeof queueRowSchema>, clientName: string | null): OrderQueueItem {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName,
    contactPhone: row.contact_phone,
    deliveryMethod: row.delivery_method,
    deliveryAddress: row.delivery_address,
    totalColones: Number(row.total_crc),
    receiptPath: row.receipt_path,
    createdAt: new Date(row.created_at),
    lines: row.store_order_items.map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      unitPrice: moneyFromColones(item.unit_price_crc),
      quantity: item.quantity,
    })),
  }
}

const REVIEW_REFUSALS: Readonly<Record<string, () => ReviewOrderFailure>> = {
  store_not_admin: createNotAdmin,
  store_order_not_found: createOrderNotFound,
  store_order_not_pending: createOrderNotPending,
}

const toFailure = (message: string): ReviewOrderFailure => {
  const refusal = REVIEW_REFUSALS[message]
  return refusal ? refusal() : createStoreStorageFailed(message)
}

export function orderReviewRepository(db: SupabaseClient): OrderReviewRepository {
  return {
    async listPending(limit) {
      const { data, error } = await db
        .from(ORDERS_TABLE)
        .select(QUEUE_COLUMNS)
        .eq('state', 'pending_approval')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(limit)
      if (error) return err(createStoreStorageFailed(error.message))
      const rows = z.array(queueRowSchema).safeParse(data ?? [])
      if (!rows.success) return err(createStoreStorageFailed(UNEXPECTED_ROW))
      if (rows.data.length === 0) return ok([])

      const clientIds = [...new Set(rows.data.map((row) => row.client_id))]
      const names = await namesByClientId(db, clientIds)
      if (isErr(names)) return names

      return ok(rows.data.map((row) => toQueueItem(row, names.value.get(row.client_id) ?? null)))
    },

    async listHistory(page, pageSize) {
      const from = page * pageSize
      const to = from + pageSize - 1
      const { data, error, count } = await db
        .from(ORDERS_TABLE)
        .select(HISTORY_COLUMNS, { count: 'exact' })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to)
      if (error) return err(createStoreStorageFailed(error.message))
      const rows = z.array(historyRowSchema).safeParse(data ?? [])
      if (!rows.success) return err(createStoreStorageFailed(UNEXPECTED_ROW))
      if (rows.data.length === 0) return ok({ items: [], page, pageSize, total: count ?? 0 })

      const clientIds = [...new Set(rows.data.map((row) => row.client_id))]
      const names = await namesByClientId(db, clientIds)
      if (isErr(names)) return names

      const items: OrderHistoryItem[] = rows.data.map((row) => ({
        ...toQueueItem(row, names.value.get(row.client_id) ?? null),
        state: row.state,
        rejectionReason: row.rejection_reason,
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
      }))
      return ok({ items, page, pageSize, total: count ?? 0 })
    },

    async approve(orderId) {
      const { error } = await db.rpc(APPROVE_FUNCTION, { p_order_id: orderId })
      if (error) return err(toFailure(error.message))
      return ok(undefined)
    },

    async reject(orderId, reason) {
      const { error } = await db.rpc(REJECT_FUNCTION, { p_order_id: orderId, p_reason: reason })
      if (error) return err(toFailure(error.message))
      return ok(undefined)
    },
  }
}
