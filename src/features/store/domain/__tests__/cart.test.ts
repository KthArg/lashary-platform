import { describe, it, expect } from 'vitest'
import { moneyFromColones } from '@/shared/money'
import { isErr, isOk } from '@/shared/result'
import {
  MAX_CART_QUANTITY,
  MIN_CART_QUANTITY,
  buildCart,
  buildCartLine,
  lineTotal,
  validateCartQuantity,
  type CartLine,
  type CartProduct,
} from '@/features/store/domain/cart'

const MAX_POSTGRES_INTEGER = 2_147_483_647

function makeProduct(priceColones: number, id = 'producto-serum'): CartProduct {
  return {
    id,
    slug: id,
    name: 'Serum nutritivo Lashary',
    imageUrl: '/productos/serum-nutritivo.jpg',
    unitPrice: moneyFromColones(priceColones),
  }
}

function makeLine(priceColones: number, quantity: number, id?: string): CartLine {
  const line = buildCartLine(makeProduct(priceColones, id), quantity)
  if (!isOk(line)) throw new Error('fixture: línea inválida')
  return line.value
}

describe('validateCartQuantity', () => {
  it('acepta los extremos del rango permitido', () => {
    expect(isOk(validateCartQuantity(MIN_CART_QUANTITY))).toBe(true)
    expect(isOk(validateCartQuantity(MAX_CART_QUANTITY))).toBe(true)
  })

  it.each([
    ['cero', MIN_CART_QUANTITY - 1],
    ['una más que el máximo', MAX_CART_QUANTITY + 1],
    ['un decimal', 1.5],
    ['NaN', Number.NaN],
  ])('rechaza %s con InvalidCartQuantity', (_label, quantity) => {
    const result = validateCartQuantity(quantity)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('STORE_CARRITO_CANTIDAD_INVALIDA')
  })
})

describe('lineTotal', () => {
  it('multiplica el precio unitario por la cantidad', () => {
    expect(lineTotal(makeLine(18000, 3)).colones).toBe(54000)
  })

  it('con el precio más alto que admite la base y la cantidad máxima sigue siendo un entero seguro', () => {
    const total = lineTotal(makeLine(MAX_POSTGRES_INTEGER, MAX_CART_QUANTITY))
    expect(Number.isSafeInteger(total.colones)).toBe(true)
  })
})

describe('buildCart', () => {
  it('el subtotal suma el total de cada línea', () => {
    const cart = buildCart([makeLine(18000, 2, 'serum'), makeLine(12000, 1, 'cepillo')])
    expect(cart.subtotal.colones).toBe(48000)
    expect(cart.lines).toHaveLength(2)
  })

  it('un carrito vacío tiene subtotal cero', () => {
    expect(buildCart([]).subtotal.colones === 0).toBe(true)
  })
})
