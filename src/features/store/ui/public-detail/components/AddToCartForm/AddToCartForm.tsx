'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { addToCartAction } from '../../../cart/actions/cart-actions'
import { initialCartActionState } from '../../../cart/types/cart-action-state'
import { PUBLIC_DETAIL_STRINGS } from '../../constants/public-detail-strings'
import { productDetailStyles as STYLES } from '../ProductDetail/ProductDetail.styles'
import type { PurchaseActionProps } from '../ProductDetail/ProductDetail.types'

export function AddToCartForm({ productId, describedBy, cartHref }: PurchaseActionProps) {
  const [state, formAction, pending] = useActionState(addToCartAction, initialCartActionState)

  return (
    <form action={formAction} className={STYLES.purchaseForm}>
      <input type="hidden" name="productId" value={productId} />
      <button
        type="submit"
        className={STYLES.addToCart}
        disabled={pending}
        aria-describedby={describedBy}
      >
        {PUBLIC_DETAIL_STRINGS.addToCart}
      </button>
      <p role="status" className={STYLES.purchaseNote}>
        {state.message}
      </p>
      <Link href={cartHref} className={STYLES.viewCart}>
        {PUBLIC_DETAIL_STRINGS.viewCart}
      </Link>
    </form>
  )
}
