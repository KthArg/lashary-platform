'use client'

import type { ComponentType } from 'react'
import { CartEmpty } from '../CartEmpty'
import { CartLineList } from '../CartLineList'
import { useCartLines } from '../../hooks/useCartLines'
import type { CartContentsProps, CartContentsView, CartViewProps } from '../../types/cart-page-view'
import { cartPageStyles as STYLES } from '../CartPage/CartPage.styles'

const CART_VIEWS: Record<CartContentsView['mode'], ComponentType<CartViewProps>> = {
  empty: CartEmpty,
  ready: CartLineList,
}

export function CartContents({ lines }: CartContentsProps) {
  const view = useCartLines(lines)
  const View = CART_VIEWS[view.mode]

  return (
    <>
      <p role="status" className={STYLES.feedback}>
        {view.feedback.message}
      </p>
      <View view={view} />
    </>
  )
}
