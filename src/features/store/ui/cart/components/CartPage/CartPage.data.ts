import { getAuthSession } from '@/features/auth'
import { getCart } from '../../../../application/cart/queries'
import { cartRepository } from '../../../../db/cart-repository'
import type { Cart, CartLine } from '../../../../domain/cart'
import { formatPriceCrc } from '../../../../domain/product'
import { publicDetailRoutes } from '../../../public-detail/constants/public-detail-routes'
import { CART_PAGE_STRINGS } from '../../constants/cart-page-strings'
import type { CartLineView } from '../../types/cart-page-view'

function toCartLineView(line: CartLine): CartLineView {
  const { product } = line
  return {
    productId: product.id,
    name: product.name,
    href: publicDetailRoutes.product(product.slug),
    imageUrl: product.imageUrl,
    imageAlt: `${CART_PAGE_STRINGS.productAltPrefix} ${product.name}`,
    unitPriceLabel: CART_PAGE_STRINGS.unitPrice(formatPriceCrc(product.unitPrice.colones)),
    unitPriceColones: product.unitPrice.colones,
    quantity: line.quantity,
  }
}

export function toCartLineViews(cart: Cart): CartLineView[] {
  return cart.lines.map(toCartLineView)
}

export async function getCartLineViews(): Promise<CartLineView[]> {
  const session = await getAuthSession()
  if (session === null) return []
  const cart = await getCart({ repo: await cartRepository() })(session.user.id)
  return toCartLineViews(cart)
}
