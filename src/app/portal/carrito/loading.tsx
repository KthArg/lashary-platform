import { CART_PAGE_STRINGS } from '@/features/store/client'
import { carritoStyles as STYLES } from './carrito.styles'

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className={STYLES.loadingBox}>
      {CART_PAGE_STRINGS.loading}
    </div>
  )
}
