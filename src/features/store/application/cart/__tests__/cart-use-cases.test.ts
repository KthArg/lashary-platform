import { describe, it, expect } from 'vitest'
import { moneyFromColones } from '@/shared/money'
import { isErr, isOk } from '@/shared/result'
import { MAX_CART_QUANTITY, MIN_CART_QUANTITY } from '@/features/store/domain/cart'
import {
  addToCart,
  removeFromCart,
  updateCartQuantity,
} from '@/features/store/application/cart/commands'
import { getCart } from '@/features/store/application/cart/queries'
import { createFakeCartRepository, makeCartProduct } from './fake-cart-repository'

const CUSTOMER_ID = 'clienta-a'
const OTHER_CUSTOMER_ID = 'clienta-b'

const serum = makeCartProduct()
const brush = makeCartProduct({
  id: 'producto-cepillo',
  slug: 'cepillo-limpiador-lashary',
  name: 'Cepillo limpiador Lashary',
  unitPrice: moneyFromColones(12000),
})
const retired = makeCartProduct({ id: 'producto-retirado', isActive: false })

function setup() {
  const repo = createFakeCartRepository([serum, brush, retired])
  return { repo, deps: { repo } }
}

describe('addToCart', () => {
  it('agrega una unidad de un producto que no estaba en el carrito', async () => {
    const { repo, deps } = setup()
    const result = await addToCart(deps)(CUSTOMER_ID, serum.id)
    expect(isOk(result) && result.value).toBe(MIN_CART_QUANTITY)
    expect(await repo.findQuantity(CUSTOMER_ID, serum.id)).toBe(MIN_CART_QUANTITY)
  })

  it('suma a la cantidad de un producto que ya estaba en el carrito', async () => {
    const { repo, deps } = setup()
    await addToCart(deps)(CUSTOMER_ID, serum.id, 2)
    await addToCart(deps)(CUSTOMER_ID, serum.id, 3)
    expect(await repo.findQuantity(CUSTOMER_ID, serum.id)).toBe(5)
  })

  it('no pasa de la cantidad máxima y deja la línea como estaba', async () => {
    const { repo, deps } = setup()
    await addToCart(deps)(CUSTOMER_ID, serum.id, MAX_CART_QUANTITY)
    const result = await addToCart(deps)(CUSTOMER_ID, serum.id)
    expect(isErr(result) && result.error.kind).toBe('InvalidCartQuantity')
    expect(await repo.findQuantity(CUSTOMER_ID, serum.id)).toBe(MAX_CART_QUANTITY)
  })

  it('rechaza agregar una cantidad negativa, que restaría', async () => {
    const { repo, deps } = setup()
    await addToCart(deps)(CUSTOMER_ID, serum.id, 5)
    const result = await addToCart(deps)(CUSTOMER_ID, serum.id, -2)
    expect(isErr(result) && result.error.kind).toBe('InvalidCartQuantity')
    expect(await repo.findQuantity(CUSTOMER_ID, serum.id)).toBe(5)
  })

  it('rechaza un producto desactivado sin guardar nada', async () => {
    const { repo, deps } = setup()
    const result = await addToCart(deps)(CUSTOMER_ID, retired.id)
    expect(isErr(result) && result.error.kind).toBe('CartProductUnavailable')
    expect(repo.saveCalls).toBe(0)
  })
})

describe('updateCartQuantity', () => {
  it('cambia la cantidad de una línea existente', async () => {
    const { repo, deps } = setup()
    await addToCart(deps)(CUSTOMER_ID, serum.id)
    const result = await updateCartQuantity(deps)(CUSTOMER_ID, serum.id, 4)
    expect(isOk(result) && result.value).toBe(4)
    expect(await repo.findQuantity(CUSTOMER_ID, serum.id)).toBe(4)
  })

  it('rechaza una cantidad fuera de rango', async () => {
    const { deps } = setup()
    await addToCart(deps)(CUSTOMER_ID, serum.id)
    const result = await updateCartQuantity(deps)(CUSTOMER_ID, serum.id, MIN_CART_QUANTITY - 1)
    expect(isErr(result) && result.error.kind).toBe('InvalidCartQuantity')
  })

  it('responde CartLineNotFound si el producto no está en el carrito', async () => {
    const { repo, deps } = setup()
    const result = await updateCartQuantity(deps)(CUSTOMER_ID, brush.id, 2)
    expect(isErr(result) && result.error.kind).toBe('CartLineNotFound')
    expect(repo.saveCalls).toBe(0)
  })

  it('responde CartProductUnavailable si el producto se desactivó', async () => {
    const { repo, deps } = setup()
    await repo.saveQuantity(CUSTOMER_ID, retired.id, 1)
    const result = await updateCartQuantity(deps)(CUSTOMER_ID, retired.id, 2)
    expect(isErr(result) && result.error.kind).toBe('CartProductUnavailable')
    expect(await repo.findQuantity(CUSTOMER_ID, retired.id)).toBe(1)
  })
})

describe('removeFromCart', () => {
  it('quita la línea del carrito', async () => {
    const { repo, deps } = setup()
    await addToCart(deps)(CUSTOMER_ID, serum.id)
    await removeFromCart(deps)(CUSTOMER_ID, serum.id)
    expect(await repo.findQuantity(CUSTOMER_ID, serum.id)).toBeNull()
  })
})

describe('getCart', () => {
  it('devuelve las líneas de la clienta con su subtotal', async () => {
    const { deps } = setup()
    await addToCart(deps)(CUSTOMER_ID, serum.id, 2)
    await addToCart(deps)(CUSTOMER_ID, brush.id)
    await addToCart(deps)(OTHER_CUSTOMER_ID, brush.id, 5)

    const cart = await getCart(deps)(CUSTOMER_ID)
    expect(cart.lines.map((line) => line.product.id)).toEqual([serum.id, brush.id])
    expect(cart.subtotal.colones).toBe(18000 * 2 + 12000)
  })
})
