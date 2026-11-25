import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { err, ok } from '@/shared/result'
import { ORDER_STATES } from '../domain/order'
import { createStoreStorageFailed } from '../domain/order-errors'
import type { MyOrdersRepository } from '../application/my-orders/ports'

export const ORDERS_TABLE = 'store_orders'

const UNEXPECTED_ROW = 'la base devolvió una fila con una forma inesperada'

const latestOrderRowSchema = z.object({
  id: z.string().guid(),
  state: z.enum(ORDER_STATES),
  total_crc: z.union([z.number(), z.string()]),
  rejection_reason: z.string().nullable(),
  created_at: z.string(),
})

export function myOrdersRepository(db: SupabaseClient): MyOrdersRepository {
  return {
    async loadMostRecent() {
      const { data, error } = await db
        .from(ORDERS_TABLE)
        .select('id, state, total_crc, rejection_reason, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
      if (error) return err(createStoreStorageFailed(error.message))
      if (!data || data.length === 0) return ok(null)

      const parsed = latestOrderRowSchema.safeParse(data[0])
      if (!parsed.success) return err(createStoreStorageFailed(UNEXPECTED_ROW))
      return ok({
        id: parsed.data.id,
        state: parsed.data.state,
        totalColones: Number(parsed.data.total_crc),
        rejectionReason: parsed.data.rejection_reason,
        createdAt: new Date(parsed.data.created_at),
      })
    },
  }
}
