import { getAuthSession } from '@/features/auth'
import { getCart } from '../../../../application/cart/queries'
import { cartRepository } from '../../../../db/cart-repository'
import { buildCart, lineTotal, type Cart, type CartLine } from '../../../../domain/cart'
import { formatPriceCrc } from '../../../../domain/product'
import { publicDetailRoutes } from '../../../public-detail/constants/public-detail-routes'
import { CART_PAGE_STRINGS } from '../../constants/cart-page-strings'
import type { CartLineView, CartPageView } from '../../types/cart-page-view'

function toCartLineView(line: CartLine): CartLineView {
  const { product } = line
  return {
    productId: product.id,
    name: product.name,
    href: publicDetailRoutes.product(product.slug),
    imageUrl: product.imageUrl,
    imageAlt: `${CART_PAGE_STRINGS.productAltPrefix} ${product.name}`,
    quantityLabel: CART_PAGE_STRINGS.quantity(line.quantity),
    unitPriceLabel: CART_PAGE_STRINGS.unitPrice(formatPriceCrc(product.unitPrice.colones)),
    lineTotalLabel: formatPriceCrc(lineTotal(line).colones),
  }
}

export function toCartPageView(cart: Cart): CartPageView {
  return {
    mode: cart.lines.length === 0 ? 'empty' : 'ready',
    lines: cart.lines.map(toCartLineView),
    subtotalLabel: formatPriceCrc(cart.subtotal.colones),
  }
}

export async function getCartPageView(): Promise<CartPageView> {
  const session = await getAuthSession()
  if (session === null) return toCartPageView(buildCart([]))
  const cart = await getCart({ repo: await cartRepository() })(session.user.id)
  return toCartPageView(cart)
}
