import { PUBLIC_DETAIL_STRINGS } from '../../constants/public-detail-strings'
import { publicDetailRoutes } from '../../constants/public-detail-routes'
import { productDetailStyles as STYLES } from '../ProductDetail/ProductDetail.styles'
import type { PurchaseActionProps } from '../ProductDetail/ProductDetail.types'

export function SignInToBuyForm({ describedBy }: PurchaseActionProps) {
  return (
    <form action={publicDetailRoutes.signIn} className={STYLES.purchaseForm}>
      <button type="submit" className={STYLES.addToCart} aria-describedby={describedBy}>
        {PUBLIC_DETAIL_STRINGS.addToCart}
      </button>
      <p className={STYLES.purchaseNote}>{PUBLIC_DETAIL_STRINGS.signInToBuy}</p>
    </form>
  )
}
