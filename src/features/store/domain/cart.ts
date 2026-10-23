import { addMoney, type Money, moneyFromColones, zeroMoney } from '@/shared/money'
import { ok, err, isErr, type Result } from '@/shared/result'
import { createInvalidCartQuantity, type InvalidCartQuantity } from './cart-errors'

export const MIN_CART_QUANTITY = 1
export const MAX_CART_QUANTITY = 99

export interface CartProduct {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly imageUrl: string
  readonly unitPrice: Money
}

const cartLineBrand: unique symbol = Symbol('CartLine')

export interface CartLine {
  readonly [cartLineBrand]: true
  readonly product: CartProduct
  readonly quantity: number
}

export interface Cart {
  readonly lines: readonly CartLine[]
  readonly subtotal: Money
}

export function validateCartQuantity(quantity: number): Result<number, InvalidCartQuantity> {
  const isInRange =
    Number.isInteger(quantity) && quantity >= MIN_CART_QUANTITY && quantity <= MAX_CART_QUANTITY
  if (!isInRange) return err(createInvalidCartQuantity(quantity))
  return ok(quantity)
}

export function buildCartLine(
  product: CartProduct,
  quantity: number,
): Result<CartLine, InvalidCartQuantity> {
  const validQuantity = validateCartQuantity(quantity)
  if (isErr(validQuantity)) return validQuantity
  return ok({ [cartLineBrand]: true, product, quantity: validQuantity.value })
}

export function lineTotal(line: CartLine): Money {
  return moneyFromColones(line.product.unitPrice.colones * line.quantity)
}

export function buildCart(lines: readonly CartLine[]): Cart {
  const subtotal = lines.reduce((total, line) => addMoney(total, lineTotal(line)), zeroMoney())
  return { lines, subtotal }
}
