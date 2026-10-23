import { addMoney, type Money, moneyFromColones, zeroMoney } from '@/shared/money'
import { MAX_CART_QUANTITY, MIN_CART_QUANTITY } from '../../../../domain/cart'
import { formatPriceCrc } from '../../../../domain/product'
import { CART_PAGE_STRINGS } from '../../constants/cart-page-strings'
import type { CartLineControls, CartLineView } from '../../types/cart-page-view'

export const REMOVED_QUANTITY = 0

export interface CartLineChange {
  productId: string
  quantity: number
}

export interface CartLineHandlers {
  changeQuantity: (productId: string, quantity: number) => void
  removeLine: (productId: string) => void
}

export function applyCartLineChange(lines: CartLineView[], change: CartLineChange): CartLineView[] {
  return lines.flatMap((line) => {
    if (line.productId !== change.productId) return [line]
    if (change.quantity === REMOVED_QUANTITY) return []
    return [{ ...line, quantity: change.quantity }]
  })
}

function lineTotal(line: CartLineView): Money {
  return moneyFromColones(line.unitPriceColones * line.quantity)
}

export function cartSubtotalLabel(lines: CartLineView[]): string {
  const subtotal = lines.reduce((total, line) => addMoney(total, lineTotal(line)), zeroMoney())
  return formatPriceCrc(subtotal.colones)
}

export function toCartLineControls(
  line: CartLineView,
  handlers: CartLineHandlers,
): CartLineControls {
  return {
    ...line,
    quantityLabel: CART_PAGE_STRINGS.quantity(line.quantity),
    lineTotalLabel: formatPriceCrc(lineTotal(line).colones),
    increaseLabel: CART_PAGE_STRINGS.increaseLabel(line.name),
    decreaseLabel: CART_PAGE_STRINGS.decreaseLabel(line.name),
    removeLabel: CART_PAGE_STRINGS.removeLabel(line.name),
    isIncreaseDisabled: line.quantity >= MAX_CART_QUANTITY,
    isDecreaseDisabled: line.quantity <= MIN_CART_QUANTITY,
    increase: () => handlers.changeQuantity(line.productId, line.quantity + 1),
    decrease: () => handlers.changeQuantity(line.productId, line.quantity - 1),
    remove: () => handlers.removeLine(line.productId),
  }
}
