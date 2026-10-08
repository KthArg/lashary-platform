import Link from 'next/link'
import { PUBLIC_GRID_STRINGS } from '../../constants/public-grid-strings'
import { publicDetailRoutes } from '../../../public-detail/constants/public-detail-routes'
import { publicProductsGridStyles as STYLES } from '../PublicProductsGrid/PublicProductsGrid.styles'
import type { ProductCardProps } from './ProductCard.types'

export function ProductCard({ card }: ProductCardProps) {
  return (
    <article className={STYLES.card} data-product-id={card.id}>
      <figure className={STYLES.figure}>
        <img
          src={card.imageUrl}
          alt={`${PUBLIC_GRID_STRINGS.productAltPrefix} ${card.name}`}
          className={STYLES.image}
          loading="lazy"
        />
      </figure>
      <div className={STYLES.cardBody}>
        <h3 className={STYLES.cardTitle}>{card.name}</h3>
        <p className={STYLES.price}>{card.priceLabel}</p>
        <div className={STYLES.cardActions}>
          <Link href={publicDetailRoutes.product(card.slug)} className={STYLES.viewMoreButton}>
            {PUBLIC_GRID_STRINGS.viewMoreLabel}
            <span className={STYLES.srOnly}>: {card.name}</span>
          </Link>
        </div>
      </div>
    </article>
  )
}
