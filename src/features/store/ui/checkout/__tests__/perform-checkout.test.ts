import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import {
  createCartEmpty,
  createInsufficientStock,
  createInvalidReceipt,
  createNotAClient,
  createStoreStorageFailed,
} from '@/features/store/domain/order-errors'
import { performCheckout, type CheckoutDeps } from '../utils/perform-checkout'
import { checkoutMessages, checkoutRefusalMessages, receiptProblemMessages } from '../constants/checkout-strings'
import type { ReceiptUpload } from '../types/checkout-results'

const PDF = new TextEncoder().encode('%PDF-1.7\n')

function upload(bytes: Uint8Array, size = bytes.byteLength): ReceiptUpload {
  return { size, arrayBuffer: async () => bytes.slice().buffer }
}

function createDeps(overrides: Partial<CheckoutDeps> = {}) {
  const requests: unknown[] = []
  const deps: CheckoutDeps = {
    isClient: async () => true,
    checkout: async (input) => {
      requests.push({ ...input, receipt: Array.from(input.receipt) })
      return ok('order-1')
    },
    ...overrides,
  }
  return { deps, requests }
}

const fields = (receipt: unknown = upload(PDF)) => ({
  contactPhone: '88887012',
  receipt,
})

describe('performCheckout', () => {
  it('finaliza la compra con el teléfono y los bytes del comprobante', async () => {
    const { deps, requests } = createDeps()
    const result = await performCheckout(fields(), deps)

    expect(result).toEqual({ ok: true, message: checkoutMessages.sent })
    expect(requests).toEqual([{ contactPhone: '88887012', receipt: Array.from(PDF) }])
  })

  it('una sesión que no es de clienta no finaliza nada', async () => {
    const { deps, requests } = createDeps({ isClient: async () => false })
    const result = await performCheckout(fields(), deps)

    expect(result).toEqual({ ok: false, message: checkoutMessages.accessDenied })
    expect(requests).toEqual([])
  })

  it('sin teléfono de contacto no se envía', async () => {
    const { deps, requests } = createDeps()
    const result = await performCheckout({ ...fields(), contactPhone: undefined }, deps)

    expect(result).toEqual({ ok: false, message: checkoutMessages.invalidForm })
    expect(requests).toEqual([])
  })

  it('sin comprobante pide adjuntarlo', async () => {
    const { deps } = createDeps()
    expect(await performCheckout(fields(null), deps)).toEqual({ ok: false, message: checkoutMessages.missingReceipt })
    expect(await performCheckout(fields(upload(new Uint8Array(0))), deps)).toEqual({
      ok: false,
      message: checkoutMessages.missingReceipt,
    })
  })

  it.each([
    [createInvalidReceipt('receipt-type-not-allowed'), receiptProblemMessages['receipt-type-not-allowed']],
    [createCartEmpty(), checkoutRefusalMessages['cart-empty']],
    [createInsufficientStock(), checkoutRefusalMessages['insufficient-stock']],
    [createNotAClient(), checkoutRefusalMessages['not-a-client']],
    [createStoreStorageFailed('caída'), checkoutMessages.storageFailed],
  ])('cada rechazo llega a la clienta con su mensaje', async (error, message) => {
    const { deps } = createDeps({ checkout: async () => err(error) })
    expect(await performCheckout(fields(), deps)).toEqual({ ok: false, message })
  })
})
