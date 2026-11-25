import { getAuthSession } from '@/features/auth'
import { getCart } from '@/features/store/application/cart/queries'
import { cartRepository } from '@/features/store/db/cart-repository'
import { formatMoney } from '@/shared/money'
import type { Cart } from '@/features/store/domain/cart'

export async function loadCart(): Promise<Cart | null> {
  const session = await getAuthSession()
  if (session === null) return null
  return getCart({ repo: await cartRepository() })(session.user.id)
}

export const totalLabelOf = (cart: Cart, totalPrefix: string): string => `${totalPrefix} ${formatMoney(cart.subtotal)}`
