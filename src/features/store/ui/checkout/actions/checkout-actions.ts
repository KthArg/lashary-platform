'use server'

import { revalidatePath } from 'next/cache'
import { CLIENT_PORTAL_ROUTES } from '@/features/auth'
import { CHECKOUT_FIELDS } from '../constants/checkout-strings'
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
  if (result.ok) revalidatePath(CLIENT_PORTAL_ROUTES.carrito)
  return result
}
