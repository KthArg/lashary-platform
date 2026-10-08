import Link from 'next/link'
import { PUBLIC_DETAIL_STRINGS } from '../../constants/public-detail-strings'
import { publicDetailRoutes } from '../../constants/public-detail-routes'
import { toProductDetailView } from './ProductDetail.data'
import { productDetailStyles as STYLES } from './ProductDetail.styles'
import type { ProductDetailProps } from './ProductDetail.types'

const AVAILABILITY_ID = 'product-availability'

export function ProductDetail({ detail }: ProductDetailProps) {
  const view = toProductDetailView(detail)

  return (
    <article className={STYLES.article}>
      <figure className={STYLES.figure}>
        <img src={view.imageUrl} alt={view.imageAlt} className={STYLES.image} />
      </figure>
      <div className={STYLES.body}>
        <h1 className={STYLES.title}>{view.name}</h1>
        <p className={STYLES.price}>{view.priceLabel}</p>
        <p className={STYLES.description}>{view.description}</p>
        <p id={AVAILABILITY_ID} className={view.availabilityClass}>
          {view.availabilityText}
        </p>
        <div className={STYLES.actions}>
          <button
            type="button"
            className={STYLES.addToCart}
            disabled={view.isPurchaseDisabled}
            aria-describedby={AVAILABILITY_ID}
          >
            {PUBLIC_DETAIL_STRINGS.addToCart}
          </button>
          <Link href={publicDetailRoutes.catalog} className={STYLES.backLink}>
            {PUBLIC_DETAIL_STRINGS.backToCatalog}
          </Link>
        </div>
      </div>
    </article>
  )
}
