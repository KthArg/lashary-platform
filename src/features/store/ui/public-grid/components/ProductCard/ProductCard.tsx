import type { PublicProductCard } from '../../../../domain/product'
import { CADENAS_GRID_PRODUCTOS_ES } from '../../constants/public-grid-strings'
import { gridProductosPublicosStyles as STYLES } from '../PublicProductsGrid/PublicProductsGrid.styles'

export function TarjetaProducto({ tarjeta }: { tarjeta: PublicProductCard }) {
  return (
    <article className={STYLES.card} data-producto-id={tarjeta.id}>
      <figure>
        <img
          src={tarjeta.imageUrl}
          alt={`${CADENAS_GRID_PRODUCTOS_ES.productAltPrefix} ${tarjeta.name}`}
          className={STYLES.image}
          loading="lazy"
        />
      </figure>
      <div className={STYLES.cardBody}>
        <h3 className={STYLES.cardTitle}>{tarjeta.name}</h3>
        <p className={STYLES.price}>{tarjeta.priceLabel}</p>
      </div>
    </article>
  )
}
