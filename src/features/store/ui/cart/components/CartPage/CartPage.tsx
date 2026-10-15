import { CartContents } from '../CartContents'
import { CART_PAGE_STRINGS } from '../../constants/cart-page-strings'
import { getCartLineViews } from './CartPage.data'
import { cartPageStyles as STYLES } from './CartPage.styles'

export async function CartPage() {
  const lines = await getCartLineViews()

  return (
    <div className={STYLES.page}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{CART_PAGE_STRINGS.title}</h1>
        <p className={STYLES.subtitle}>{CART_PAGE_STRINGS.subtitle}</p>
      </header>
      <CartContents lines={lines} />
    </div>
  )
}
