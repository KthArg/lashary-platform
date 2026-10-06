import type { TarjetaProductoPublico } from '../../domain/producto'
import { CADENAS_GRID_PRODUCTOS_ES } from '../../constants/grid-productos-publicos-cadenas-es'
import { gridProductosPublicosStyles as s } from './GridProductosPublicos.styles'

export function TarjetaProducto({ tarjeta }: { tarjeta: TarjetaProductoPublico }) {
  return (
    <article className={s.card} data-producto-id={tarjeta.id}>
      <figure>
        <img
          src={tarjeta.urlImagen}
          alt={`${CADENAS_GRID_PRODUCTOS_ES.prefijoAltProducto} ${tarjeta.nombre}`}
          className={s.image}
          loading="lazy"
        />
      </figure>
      <div className={s.cardBody}>
        <h3 className={s.cardTitle}>{tarjeta.nombre}</h3>
        <p className={s.price}>{tarjeta.etiquetaPrecio}</p>
      </div>
    </article>
  )
}
