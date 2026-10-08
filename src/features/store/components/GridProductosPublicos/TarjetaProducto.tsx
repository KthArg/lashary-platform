import type { TarjetaProductoPublico } from '../../domain/product'
import { CADENAS_GRID_PRODUCTOS_ES } from '../../constants/grid-productos-publicos-cadenas-es'
import { gridProductosPublicosStyles as STYLES } from './GridProductosPublicos.styles'

export function TarjetaProducto({ tarjeta }: { tarjeta: TarjetaProductoPublico }) {
  return (
    <article className={STYLES.card} data-producto-id={tarjeta.id}>
      <figure>
        <img
          src={tarjeta.urlImagen}
          alt={`${CADENAS_GRID_PRODUCTOS_ES.prefijoAltProducto} ${tarjeta.nombre}`}
          className={STYLES.image}
          loading="lazy"
        />
      </figure>
      <div className={STYLES.cardBody}>
        <h3 className={STYLES.cardTitle}>{tarjeta.nombre}</h3>
        <p className={STYLES.price}>{tarjeta.etiquetaPrecio}</p>
      </div>
    </article>
  )
}
