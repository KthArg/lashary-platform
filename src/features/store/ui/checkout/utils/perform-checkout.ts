import { z } from 'zod'
import type { Result } from '@/shared/result'
import { isErr } from '@/shared/result'
import type { CheckoutFailure, CheckoutInput } from '@/features/store/application/checkout/checkout'
import { checkoutMessages, checkoutRefusalMessages, receiptProblemMessages } from '../constants/checkout-strings'
import type { CheckoutActionResult, ReceiptUpload } from '../types/checkout-results'

export type CheckoutDeps = {
  isClient: () => Promise<boolean>
  checkout: (input: CheckoutInput) => Promise<Result<string, CheckoutFailure>>
}

const formSchema = z.object({
  contactPhone: z.string(),
})

const isReceiptUpload = (value: unknown): value is ReceiptUpload =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ReceiptUpload).size === 'number' &&
  typeof (value as ReceiptUpload).arrayBuffer === 'function'

function messageFor(error: CheckoutFailure): string {
  switch (error.code) {
    case 'STORE_COMPROBANTE_INVALIDO':
      return receiptProblemMessages[error.problem]
    case 'STORE_NO_ES_CLIENTA':
      return checkoutRefusalMessages['not-a-client']
    case 'STORE_CARRITO_VACIO':
      return checkoutRefusalMessages['cart-empty']
    case 'STORE_EXISTENCIAS_INSUFICIENTES':
      return checkoutRefusalMessages['insufficient-stock']
    case 'STORE_COMPROBANTE_NO_ENCONTRADO':
      return checkoutRefusalMessages['receipt-not-found']
    case 'STORE_COMPROBANTE_YA_USADO':
      return checkoutRefusalMessages['receipt-already-used']
    case 'STORE_PEDIDO_TELEFONO_INVALIDO':
      return error.message
    default:
      return checkoutMessages.storageFailed
  }
}

export async function performCheckout(
  fields: { contactPhone: unknown; receipt: unknown },
  deps: CheckoutDeps,
): Promise<CheckoutActionResult> {
  if (!(await deps.isClient())) return { ok: false, message: checkoutMessages.accessDenied }

  const parsed = formSchema.safeParse({ contactPhone: fields.contactPhone })
  if (!parsed.success) return { ok: false, message: checkoutMessages.invalidForm }

  if (!isReceiptUpload(fields.receipt) || fields.receipt.size === 0) {
    return { ok: false, message: checkoutMessages.missingReceipt }
  }

  const receipt = new Uint8Array(await fields.receipt.arrayBuffer())
  const result = await deps.checkout({ contactPhone: parsed.data.contactPhone, receipt })
  if (isErr(result)) return { ok: false, message: messageFor(result.error) }
  return { ok: true, message: checkoutMessages.sent }
}
