'use server'

import { revalidatePath } from 'next/cache'
import { CHECKOUT_FIELDS, CHECKOUT_PATH } from '../constants/checkout-strings'
import { checkoutService } from '../services/checkout-service'
import type { CheckoutActionResult } from '../types/checkout-results'

export async function checkoutAction(
  _previous: CheckoutActionResult | null,
  formData: FormData,
): Promise<CheckoutActionResult> {
  const result = await checkoutService.submit({
    contactPhone: formData.get(CHECKOUT_FIELDS.contactPhone),
    receipt: formData.get(CHECKOUT_FIELDS.receipt),
  })
  if (result.ok) revalidatePath(CHECKOUT_PATH)
  return result
}
