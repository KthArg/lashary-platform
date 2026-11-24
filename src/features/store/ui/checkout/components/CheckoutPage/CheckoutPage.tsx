import { checkoutMessages } from '../../constants/checkout-strings'
import { CheckoutForm } from '../CheckoutForm'
import { loadCart, totalLabelOf } from './CheckoutPage.data'
import { checkoutPageStyles as STYLES } from './CheckoutPage.styles'

export async function CheckoutPage() {
  const cart = await loadCart()
  const isCartEmpty = cart === null || cart.lines.length === 0

  return (
    <div className={STYLES.page}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{checkoutMessages.title}</h1>
        <p className={STYLES.subtitle}>{checkoutMessages.subtitle}</p>
      </header>
      <CheckoutForm
        isCartEmpty={isCartEmpty}
        totalLabel={cart ? totalLabelOf(cart, checkoutMessages.totalPrefix) : ''}
      />
    </div>
  )
}
