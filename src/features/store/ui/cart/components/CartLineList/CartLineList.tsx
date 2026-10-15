import Link from 'next/link'
import { CART_PAGE_STRINGS } from '../../constants/cart-page-strings'
import type { CartViewProps } from '../../types/cart-page-view'
import { cartPageStyles as STYLES } from '../CartPage/CartPage.styles'

export function CartLineList({ view }: CartViewProps) {
  return (
    <div className={STYLES.card}>
      <ul aria-label={CART_PAGE_STRINGS.linesAriaLabel} className={STYLES.lines}>
        {view.lines.map((line) => (
          <li key={line.productId} className={STYLES.line}>
            <img src={line.imageUrl} alt={line.imageAlt} className={STYLES.lineImage} />
            <div className={STYLES.lineBody}>
              <Link href={line.href} className={STYLES.lineName}>
                {line.name}
              </Link>
              <p className={STYLES.muted}>{line.unitPriceLabel}</p>
              <div className={STYLES.quantityControls}>
                <button
                  type="button"
                  className={STYLES.quantityButton}
                  aria-label={line.decreaseLabel}
                  disabled={line.isDecreaseDisabled}
                  onClick={line.decrease}
                >
                  {CART_PAGE_STRINGS.decreaseSymbol}
                </button>
                <span className={STYLES.quantity}>{line.quantityLabel}</span>
                <button
                  type="button"
                  className={STYLES.quantityButton}
                  aria-label={line.increaseLabel}
                  disabled={line.isIncreaseDisabled}
                  onClick={line.increase}
                >
                  {CART_PAGE_STRINGS.increaseSymbol}
                </button>
                <button
                  type="button"
                  className={STYLES.removeButton}
                  aria-label={line.removeLabel}
                  onClick={line.remove}
                >
                  {CART_PAGE_STRINGS.remove}
                </button>
              </div>
            </div>
            <p className={STYLES.lineTotal}>{line.lineTotalLabel}</p>
          </li>
        ))}
      </ul>
      <dl className={STYLES.subtotal}>
        <dt>{CART_PAGE_STRINGS.subtotal}</dt>
        <dd className={STYLES.subtotalAmount}>{view.subtotalLabel}</dd>
      </dl>
    </div>
  )
}
