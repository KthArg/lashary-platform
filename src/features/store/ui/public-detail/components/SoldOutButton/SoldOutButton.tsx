import { PUBLIC_DETAIL_STRINGS } from '../../constants/public-detail-strings'
import { productDetailStyles as STYLES } from '../ProductDetail/ProductDetail.styles'
import type { PurchaseActionProps } from '../ProductDetail/ProductDetail.types'

export function SoldOutButton({ describedBy }: PurchaseActionProps) {
  return (
    <button type="button" className={STYLES.addToCart} disabled aria-describedby={describedBy}>
      {PUBLIC_DETAIL_STRINGS.addToCart}
    </button>
  )
}
