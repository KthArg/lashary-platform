import { describe, it, expect, vi } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { createCartEmpty, createNotAClient } from '../../../domain/order-errors'
import { checkout } from '../checkout'
import type { CheckoutRepository } from '../ports'

const BYTES = new TextEncoder().encode('%PDF-1.7\n')

function createRepo(result: Awaited<ReturnType<CheckoutRepository['checkout']>>) {
  const calls: Array<Parameters<CheckoutRepository['checkout']>[0]> = []
  const repo: CheckoutRepository = {
    async checkout(input) {
      calls.push(input)
      return result
    },
  }
  return { repo, calls }
}

describe('checkout', () => {
  it('valida el teléfono de contacto antes de subir el comprobante', async () => {
    const upload = vi.fn()
    const { repo, calls } = createRepo(ok('order-1'))

    const result = await checkout({ upload, repo })({ contactPhone: '123', receipt: BYTES })

    expect(isErr(result) && result.error.code).toBe('STORE_PEDIDO_TELEFONO_INVALIDO')
    expect(upload).not.toHaveBeenCalled()
    expect(calls).toEqual([])
  })

  it('si subir el comprobante falla, no llama al repositorio', async () => {
    const upload = vi.fn().mockResolvedValue(err(createNotAClient()))
    const { repo, calls } = createRepo(ok('order-1'))

    const result = await checkout({ upload, repo })({ contactPhone: '88887012', receipt: BYTES })

    expect(isErr(result) && result.error.code).toBe('STORE_NO_ES_CLIENTA')
    expect(calls).toEqual([])
  })

  it('con datos válidos, sube el comprobante y finaliza la compra de retiro con su ruta', async () => {
    const upload = vi.fn().mockResolvedValue(ok('clienta-1/r1.pdf'))
    const { repo, calls } = createRepo(ok('order-1'))

    const result = await checkout({ upload, repo })({ contactPhone: '  88887012  ', receipt: BYTES })

    expect(isOk(result) && result.value).toBe('order-1')
    expect(calls).toEqual([
      {
        contactPhone: '88887012',
        deliveryMethod: 'pickup',
        deliveryAddress: null,
        receiptPath: 'clienta-1/r1.pdf',
      },
    ])
  })

  it('un carrito vacío lo rechaza el repositorio, no el dominio', async () => {
    const upload = vi.fn().mockResolvedValue(ok('clienta-1/r1.pdf'))
    const { repo } = createRepo(err(createCartEmpty()))

    const result = await checkout({ upload, repo })({ contactPhone: '88887012', receipt: BYTES })

    expect(isErr(result) && result.error.code).toBe('STORE_CARRITO_VACIO')
  })
})
