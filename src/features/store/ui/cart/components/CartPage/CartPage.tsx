import type { ComponentType } from 'react'
import { CartEmpty } from '../CartEmpty'
import { CartLineList } from '../CartLineList'
import { CART_PAGE_STRINGS } from '../../constants/cart-page-strings'
import type { CartPageView, CartViewProps } from '../../types/cart-page-view'
import { getCartPageView } from './CartPage.data'
import { cartPageStyles as STYLES } from './CartPage.styles'

const CART_VIEWS: Record<CartPageView['mode'], ComponentType<CartViewProps>> = {
  empty: CartEmpty,
  ready: CartLineList,
}

export async function CartPage() {
  const view = await getCartPageView()
  const View = CART_VIEWS[view.mode]

  return (
    <div className={STYLES.page}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{CART_PAGE_STRINGS.title}</h1>
        <p className={STYLES.subtitle}>{CART_PAGE_STRINGS.subtitle}</p>
      </header>
      <View view={view} />
    </div>
  )
}
