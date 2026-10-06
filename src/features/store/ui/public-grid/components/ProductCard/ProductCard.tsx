import { PUBLIC_GRID_STRINGS } from '../../constants/public-grid-strings'
import { publicProductsGridStyles as STYLES } from '../PublicProductsGrid/PublicProductsGrid.styles'
import type { ProductCardProps } from './ProductCard.types'

export function ProductCard({ card }: ProductCardProps) {
  return (
    <article className={STYLES.card} data-producto-id={card.id}>
      <figure>
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
      </div>
    </article>
  )
}
