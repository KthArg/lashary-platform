import Link from 'next/link'
import { publicDetailRoutes } from '../../../public-detail/constants/public-detail-routes'
import { CART_PAGE_STRINGS } from '../../constants/cart-page-strings'
import { cartPageStyles as STYLES } from '../CartPage/CartPage.styles'

export function CartEmpty() {
  return (
    <div className={STYLES.emptyCard}>
      <p className={STYLES.emptyTitle}>{CART_PAGE_STRINGS.emptyTitle}</p>
      <p className={STYLES.muted}>{CART_PAGE_STRINGS.emptyDescription}</p>
      <Link href={publicDetailRoutes.catalog} className={STYLES.emptyAction}>
        {CART_PAGE_STRINGS.emptyAction}
      </Link>
    </div>
  )
}
