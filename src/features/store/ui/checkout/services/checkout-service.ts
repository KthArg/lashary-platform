import { AUTH_ROLES, getAuthSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { checkout } from '@/features/store/application/checkout/checkout'
import { uploadReceipt } from '@/features/store/application/checkout/upload-receipt'
import { checkoutRepository } from '@/features/store/db/checkout-repository'
import { currentClient, receiptStorage } from '@/features/store/db/receipt-storage'
import { performCheckout, type CheckoutDeps } from '../utils/perform-checkout'
import type { CheckoutActionResult } from '../types/checkout-results'

async function createDeps(): Promise<CheckoutDeps> {
  const db = await createClient()
  return {
    isClient: async () => {
      const session = await getAuthSession()
      return Boolean(session?.user) && session?.role === AUTH_ROLES.CLIENTE
    },
    checkout: checkout({
      upload: uploadReceipt({ storage: receiptStorage(db), currentClient: currentClient(db), newId: () => crypto.randomUUID() }),
      repo: checkoutRepository(db),
    }),
  }
}

export const checkoutService = {
  async submit(fields: { contactPhone: unknown; receipt: unknown }): Promise<CheckoutActionResult> {
    return performCheckout(fields, await createDeps())
  },
}
