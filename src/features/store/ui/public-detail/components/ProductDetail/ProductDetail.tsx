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
    <div className={STYLES.wrapper}>
      <Link href={publicDetailRoutes.catalog} className={STYLES.backButton}>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={STYLES.backIcon}
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        {PUBLIC_DETAIL_STRINGS.backToCatalog}
      </Link>
      <article className={STYLES.article}>
        <figure className={STYLES.figure}>
          <img src={view.imageUrl} alt={view.imageAlt} className={STYLES.image} />
        </figure>
        <div className={STYLES.body}>
          <h1 className={STYLES.title}>{view.name}</h1>
          <p className={STYLES.price}>{view.priceLabel}</p>
          <p id={AVAILABILITY_ID} className={STYLES.availability}>
            <span className={view.availabilityClass}>{view.availabilityText}</span>
          </p>
          <p className={STYLES.description}>{view.description}</p>
          <div className={STYLES.actions}>
            <button
              type="button"
              className={STYLES.addToCart}
              disabled={view.isPurchaseDisabled}
              aria-describedby={AVAILABILITY_ID}
            >
              {PUBLIC_DETAIL_STRINGS.addToCart}
            </button>
          </div>
        </div>
      </article>
    </div>
  )
}
