import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { err, ok } from '@/shared/result'
import {
  createCartEmpty,
  createInsufficientStock,
  createNotAClient,
  createReceiptAlreadyUsed,
  createReceiptNotFound,
  createStoreStorageFailed,
} from '../domain/order-errors'
import type { CheckoutRefusal, CheckoutRepository } from '../application/checkout/ports'

export const CHECKOUT_FUNCTION = 'store_checkout'

const CHECKOUT_REFUSALS: Readonly<Record<string, () => CheckoutRefusal>> = {
  store_not_a_client: createNotAClient,
  store_cart_empty: createCartEmpty,
  store_insufficient_stock: createInsufficientStock,
  store_receipt_not_found: createReceiptNotFound,
  store_receipt_already_used: createReceiptAlreadyUsed,
}

const orderIdSchema = z.string().guid()

export function checkoutRepository(db: SupabaseClient): CheckoutRepository {
  return {
    async checkout(input) {
      const { data, error } = await db.rpc(CHECKOUT_FUNCTION, {
        p_contact_phone: input.contactPhone,
        p_delivery_method: input.deliveryMethod,
        p_delivery_address: input.deliveryAddress,
        p_receipt_path: input.receiptPath,
      })
      if (error) {
        const refusal = CHECKOUT_REFUSALS[error.message]
        return err(refusal ? refusal() : createStoreStorageFailed(error.message))
      }
      const parsed = orderIdSchema.safeParse(data)
      if (!parsed.success) {
        return err(createStoreStorageFailed('la base devolvió una fila con una forma inesperada'))
      }
      return ok(parsed.data)
    },
  }
}
